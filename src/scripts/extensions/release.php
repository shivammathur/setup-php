<?php

// Resolve one extension release into either a binary artifact or a source checkout.
class ExtensionRelease
{
    public static function version($version)
    {
        if (!preg_match('/^v?(\d+(?:\.\d+){0,3})(?:-?(dev|alpha|a|beta|b|RC|pl|p|stable)\.?(\d*))?(?:\+[^\s]+)?$/i', $version, $match)) {
            throw new RuntimeException('Unsupported release version: ' . $version);
        }
        $labels = array('a' => 'alpha', 'b' => 'beta', 'p' => 'pl', 'rc' => 'RC');
        $label = isset($match[2]) ? strtolower($match[2]) : 'stable';
        $label = isset($labels[$label]) ? $labels[$label] : $label;
        $suffix = $label === 'stable' ? '' : '-' . $label . (isset($match[3]) ? $match[3] : '');
        return implode('.', array_pad(explode('.', $match[1]), 4, '0')) . $suffix;
    }

    private static function bound($parts, $index)
    {
        $parts = array_pad($parts, 4, 0);
        $parts[$index]++;
        for ($i = $index + 1; $i < 4; $i++) { $parts[$i] = 0; }
        return implode('.', $parts) . '-dev';
    }

    // Package PHP requirements use Composer's public range syntax, without its installer.
    public static function satisfies($version, $constraint)
    {
        $version = self::version($version);
        $constraint = preg_replace('/@(dev|alpha|beta|RC|stable)\b/i', '', trim($constraint));
        foreach (preg_split('/\s*\|\|?\s*/', $constraint) as $alternative) {
            $alternative = preg_replace_callback('/\bv?(\d+(?:\.\d+){0,3})\s+-\s+v?(\d+(?:\.\d+){0,3})\b/', function ($match) {
                $upper = explode('.', $match[2]);
                return '>=' . $match[1] . ' ' . (count($upper) < 3 ? '<' . self::bound($upper, count($upper) - 1) : '<=' . $match[2]);
            }, $alternative);
            $alternative = preg_replace('/([<>!=~^]+)\s+(?=v?\d)/', '$1', trim($alternative));
            if ($alternative === '') { throw new RuntimeException('Empty version constraint'); }
            $matches = true;
            foreach (preg_split('/[\s,]+/', $alternative) as $term) {
                if (!self::matchesTerm($version, $term)) { $matches = false; }
            }
            if ($matches) { return true; }
        }
        return false;
    }

    private static function matchesTerm($version, $term)
    {
        if (!preg_match('/^(>=|<=|!=|<>|==|>|<|=|\^|~)?(.*)$/', $term, $match)) {
            throw new RuntimeException('Invalid version constraint: ' . $term);
        }
        $operator = $match[1] ?: '==';
        $target = $match[2];
        if ($target === '*' || strtolower($target) === 'x') { return $operator !== '!=' && $operator !== '<>'; }
        if (preg_match('/^v?(\d+(?:\.\d+)*)\.(?:\*|x)(?:\.(?:\*|x))*$/i', $target, $wildcard)) {
            if (!in_array($operator, array('==', '=', '!=', '<>'), true)) { throw new RuntimeException('Invalid wildcard constraint: ' . $term); }
            $parts = explode('.', $wildcard[1]);
            $inside = version_compare($version, self::version($wildcard[1]) . '-dev', '>=') && version_compare($version, self::bound($parts, count($parts) - 1), '<');
            return $operator === '!=' || $operator === '<>' ? !$inside : $inside;
        }
        $normal = self::version($target);
        $hasStability = (bool) preg_match('/^v?\d+(?:\.\d+){0,3}-?(?:dev|alpha|beta|rc|stable|pl|a|b|p)\.?\d*(?:\+.*)?$/i', $target);
        if ($operator === '^' || $operator === '~') {
            preg_match('/^v?(\d+(?:\.\d+){0,3})/', $target, $numeric);
            $parts = explode('.', $numeric[1]);
            $index = $operator === '~' ? max(0, count($parts) - 2) : 0;
            if ($operator === '^') {
                while ($index < count($parts) - 1 && (int) $parts[$index] === 0) { $index++; }
            }
            return version_compare($version, $normal . ($hasStability ? '' : '-dev'), '>=') && version_compare($version, self::bound($parts, $index), '<');
        }
        if (!$hasStability && ($operator === '>=' || $operator === '<')) { $normal .= '-dev'; }
        return version_compare($version, $normal, $operator);
    }

    public static function expand($metadata, $name)
    {
        if (!isset($metadata['packages'][$name])) { throw new RuntimeException('No release metadata for ' . $name); }
        if (!isset($metadata['minified'])) { return $metadata['packages'][$name]; }
        if ($metadata['minified'] !== 'composer/2.0') { throw new RuntimeException('Unsupported package metadata format'); }
        $previous = array();
        $packages = array();
        foreach ($metadata['packages'][$name] as $changes) {
            foreach ($changes as $key => $value) {
                if ($value === '__unset') { unset($previous[$key]); } else { $previous[$key] = $value; }
            }
            $packages[] = $previous;
        }
        return $packages;
    }

    public static function selectPackage($packages, $requested, $platform)
    {
        $constraint = in_array($requested, array('', 'latest', 'stable'), true) ? '*' : $requested;
        if (preg_match('/^v?\d+(?:\.\d+)?$/i', $constraint)) { $constraint .= '.*'; }
        $stabilities = array('dev' => 0, 'alpha' => 1, 'a' => 1, 'beta' => 2, 'b' => 2, 'rc' => 3, 'stable' => 4, 'pl' => 4, 'p' => 4);
        $minimum = 4;
        if (preg_match_all('/(?:@|\d[.-]?)(dev|alpha|beta|rc|a|b)\d*\b/i', $constraint, $matches)) {
            foreach ($matches[1] as $stability) { $minimum = min($minimum, $stabilities[strtolower($stability)]); }
        }
        usort($packages, function ($a, $b) { return version_compare(self::version($b['version']), self::version($a['version'])); });
        foreach ($packages as $package) {
            $version = self::version($package['version']);
            $stability = preg_match('/-(dev|alpha|beta|rc|a|b|pl|p)/i', $version, $match) ? $stabilities[strtolower($match[1])] : 4;
            if ($stability < $minimum || !self::satisfies($version, $constraint)) { continue; }
            $options = isset($package['php-ext']) ? $package['php-ext'] : array();
            if (!isset($package['type']) || !in_array($package['type'], array('php-ext', 'php-ext-zend'), true)) { continue; }
            if (isset($options['os-families']) && !in_array($platform['os'], $options['os-families'], true)) { continue; }
            if (isset($options['os-families-exclude']) && in_array($platform['os'], $options['os-families-exclude'], true)) { continue; }
            $threadMode = $platform['zts'] ? 'support-zts' : 'support-nts';
            if (isset($options[$threadMode]) && !$options[$threadMode]) { continue; }
            foreach (array('require', 'conflict') as $rule) {
                foreach (isset($package[$rule]) ? $package[$rule] : array() as $name => $range) {
                    if (!in_array($name, array('php', 'php-64bit', 'php-zts', 'php-debug'), true)) { continue; }
                    $present = $name === 'php' || ($name === 'php-64bit' && $platform['bits'] === 64) || ($name === 'php-zts' && $platform['zts']) || ($name === 'php-debug' && $platform['debug']);
                    $matches = $present && self::satisfies($platform['version'], $range);
                    if (($rule === 'require' && !$matches) || ($rule === 'conflict' && $matches)) { continue 3; }
                }
            }
            return $package;
        }
        throw new RuntimeException('No compatible release for ' . $requested);
    }

    private static function architecture($arch)
    {
        $arch = strtolower($arch);
        if (in_array($arch, array('amd64', 'x64', 'x86_64'), true)) { return 'x86_64'; }
        if (in_array($arch, array('arm64', 'aarch64'), true)) { return 'arm64'; }
        if (in_array($arch, array('x86', 'i386', 'i686'), true)) { return 'x86'; }
        return $arch;
    }

    // Decode the platform declared by an asset name; do not guess download URLs.
    public static function decodeAsset($name, $extension)
    {
        $prefix = 'php_' . $extension . '-';
        if (stripos($name, $prefix) !== 0) { return null; }
        $name = substr($name, strlen($prefix));
        $arch = '(x86_64|amd64|x64|arm64|aarch64|x86)';
        if (preg_match('/^(.+)_php(\d+\.\d+)-' . $arch . '-(linux|darwin|windows)-(glibc|musl|anylibc|bsdlibc)(-debug)?(?:-(zts|nts))?\.(zip|tgz|tar\.gz|so)$/i', $name, $match)) {
            return array('version' => self::version($match[1]), 'php' => $match[2], 'arch' => self::architecture($match[3]), 'os' => strtolower($match[4]), 'libc' => strtolower($match[5]), 'debug' => !empty($match[6]), 'zts' => isset($match[7]) && strtolower($match[7]) === 'zts', 'format' => strtolower($match[8]));
        }
        foreach (array('(nts|ts)-(vs\d+|vc\d+)', '(vs\d+|vc\d+)-(nts|ts)') as $order => $build) {
            if (preg_match('/^(.+)-(\d+\.\d+)-' . $build . '-' . $arch . '\.(zip|dll)$/i', $name, $match)) {
                return array('version' => self::version($match[1]), 'php' => $match[2], 'arch' => self::architecture($match[5]), 'os' => 'windows', 'compiler' => strtolower($match[$order === 0 ? 4 : 3]), 'debug' => false, 'zts' => strtolower($match[$order === 0 ? 3 : 4]) === 'ts', 'format' => strtolower($match[6]));
            }
        }
        return null;
    }

    public static function selectAsset($assets, $extension, $version, $platform)
    {
        $matches = array();
        foreach ($assets as $asset) {
            try { $abi = self::decodeAsset($asset['name'], $extension); } catch (RuntimeException $error) { continue; }
            if (!$abi || version_compare($abi['version'], self::version($version), '!=') || $abi['php'] !== $platform['php'] || $abi['os'] !== $platform['os'] || $abi['arch'] !== $platform['arch'] || $abi['zts'] !== $platform['zts'] || $abi['debug'] !== $platform['debug']) { continue; }
            if ($platform['os'] === 'windows') {
                if (!isset($abi['compiler']) || $abi['compiler'] !== $platform['compiler']) { continue; }
            } elseif ($abi['libc'] !== $platform['libc'] && !($platform['os'] === 'linux' && $abi['libc'] === 'anylibc')) { continue; }
            $rank = (isset($abi['libc']) && $abi['libc'] === 'anylibc' ? 10 : 0) + array_search($abi['format'], array('zip', 'tgz', 'tar.gz', 'so', 'dll'), true);
            $matches[$rank][] = $asset;
        }
        if (!$matches) { return null; }
        ksort($matches);
        $best = reset($matches);
        if (count($best) !== 1) { throw new RuntimeException('Multiple release assets match the PHP platform'); }
        return $best[0];
    }

    private static function request($url, $optional = false)
    {
        $headers = array('User-Agent: setup-php', 'Accept: application/json');
        $token = getenv('GITHUB_TOKEN');
        if ($token && parse_url($url, PHP_URL_HOST) === 'api.github.com') { $headers[] = 'Authorization: Bearer ' . $token; }
        $curl = curl_init($url);
        curl_setopt_array($curl, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_ENCODING => '', CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 30));
        $response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($optional && $status === 404) { return null; }
        if ($response === false || $status !== 200) { throw new RuntimeException('Could not fetch release metadata (HTTP ' . $status . ')'); }
        $data = json_decode($response, true);
        if (!is_array($data)) { throw new RuntimeException('Invalid release metadata'); }
        return $data;
    }

    public static function resolve($extension, $requested, $libc, $compiler)
    {
        $extension = strtolower($extension);
        $mapping = json_decode(file_get_contents(__DIR__ . '/../../configs/pie-extensions.json'), true);
        if (strpos($requested, '/') === false) {
            if (!isset($mapping[$extension])) { throw new RuntimeException('No package mapping for ' . $extension); }
            $requested = $mapping[$extension] . ':' . ($requested ?: 'latest');
        }
        $parts = explode(':', $requested, 2);
        $parts[0] = strtolower($parts[0]);
        if (!preg_match('{^[a-z0-9_.-]+/[a-z0-9_.-]+$}i', $parts[0])) { throw new RuntimeException('Invalid extension package'); }
        $os = strtolower(PHP_OS_FAMILY);
        $platform = array('version' => PHP_VERSION, 'php' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'bits' => PHP_INT_SIZE * 8, 'os' => $os, 'arch' => PHP_INT_SIZE === 4 ? 'x86' : self::architecture(php_uname('m')), 'zts' => (bool) PHP_ZTS, 'debug' => (bool) PHP_DEBUG, 'libc' => $libc, 'compiler' => strtolower($compiler));
        $package = self::selectPackage(self::expand(self::request('https://repo.packagist.org/p2/' . $parts[0] . '.json'), $parts[0]), isset($parts[1]) ? $parts[1] : 'latest', $platform);
        $extension = isset($package['php-ext']['extension-name']) ? $package['php-ext']['extension-name'] : $extension;
        if (!preg_match('/^[a-z0-9_]+$/i', $extension)) { throw new RuntimeException('Invalid extension name'); }
        $source = isset($package['source']) ? $package['source'] : array();
        $plan = array('kind' => 'source', 'extension' => $extension, 'version' => $package['version'], 'prefix' => $package['type'] === 'php-ext-zend' ? 'zend_extension' : 'extension', 'source' => $source, 'buildPath' => isset($package['php-ext']['build-path']) ? $package['php-ext']['build-path'] : '', 'reason' => 'No compatible binary in the selected release');
        $dist = isset($package['dist']['url']) ? $package['dist']['url'] : '';
        if (!preg_match('{^https://api\.github\.com/repos/([a-z0-9_.-]+/[a-z0-9_.-]+)/}i', $dist, $repository)
            && !preg_match('{^https://github\.com/([a-z0-9_.-]+/[a-z0-9_.-]+?)(?:\.git)?$}i', isset($source['url']) ? $source['url'] : '', $repository)) { return $plan; }
        $release = self::request('https://api.github.com/repos/' . $repository[1] . '/releases/tags/' . rawurlencode($package['version']), true);
        if ($release !== null && (!isset($release['assets']) || !is_array($release['assets']))) { throw new RuntimeException('Invalid release asset metadata'); }
        $asset = $release ? self::selectAsset($release['assets'], $extension, $package['version'], $platform) : null;
        if (!$asset) { return $plan; }
        unset($plan['reason']);
        return array_merge($plan, array('kind' => 'binary', 'url' => $asset['browser_download_url'], 'name' => $asset['name'], 'digest' => isset($asset['digest']) ? $asset['digest'] : ''));
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    try {
        echo json_encode(ExtensionRelease::resolve($argv[1], $argv[2], $argv[3], isset($argv[4]) ? $argv[4] : ''));
    } catch (Exception $error) {
        fwrite(STDERR, $error->getMessage() . PHP_EOL);
        exit(1);
    }
}
