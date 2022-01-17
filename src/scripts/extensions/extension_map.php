<?php

/**
 * Class for a map of extensions and their dependent extensions.
 *
 * Class ExtensionMap
 */
class ExtensionMap {
    /** @var string Directory in which shared extensions are stored. */
    private $extension_dir;

    /** @var string File extension for PHP extension file. */
    private $file_extension;

    /** @var string Prefix in PHP extension file. */
    private $file_prefix;

    /** @var array Array to store the map */
    private $map;

    /**
     * ExtensionMap constructor.
     */
    function __construct() {
        $this->extension_dir = ini_get('extension_dir');
        $this->file_extension = (PHP_OS == 'WINNT' ? '.dll' : '.so');
        $this->file_prefix = (PHP_OS == 'WINNT' ? 'php_' : '');
        $this->map = array();
    }

    /**
     * Function to read the extension map.
     */
    private function parseMap($path) {
        if(file_exists($path)) {
            $handle = fopen($path, "r");
            if ($handle) {
                while (($line = fgets($handle)) !== false) {
                    $line_parts = explode(':', $line);
                    $this->map[$line_parts[0]] = explode(' ', trim($line_parts[1]));
                }
                fclose($handle);
            }
        }
    }

    /**
     * Function to check if a shared extension file exists.
     *
     * @param string $extension
     * @return bool
     */
    private function checkSharedExtension($extension) {
        $extension_file = $this->extension_dir. DIRECTORY_SEPARATOR . $this->file_prefix . $extension . $this->file_extension;
        return file_exists($extension_file);
    }

    /**
     * Function to get all shared extensions.
     *
     * @return string[]
     */
    private function getSharedExtensions() {
        $files = scandir($this->extension_dir);
        $extensions = array_diff($files, array('.','..'));
        $filter_pattern = "/$this->file_extension|$this->file_prefix/";
        return array_map(function ($extension) use($filter_pattern) {
            return preg_replace($filter_pattern, '', $extension);
        }, $extensions);
    }

    /**
     * Function to patch dependencies if there are any bugs in Reflection data.
     *
     * @param string $extension
     * @param array $dependencies
     * @return array
     */
    private function patchDependencies($extension, $dependencies) {
        // memcached 2.2.0 has no dependencies in reflection data.
        if($extension == 'memcached') {
            $dependencies = array_unique(array_merge($dependencies, array('igbinary', 'json', 'msgpack')));
        }
        return $dependencies;
    }

    /**
     * Function to add extension to the map.
     *
     * @param string $extension
     * @throws ReflectionException
     */
    private function addExtensionToMap($extension) {
        if($this->map && array_key_exists($extension, $this->map) && !empty($this->map[$extension])) {
            return;
        }
        // PHP 5.3 does not allow using $this.
        $self = $this;

        $ref = new ReflectionExtension($extension);
        $dependencies = array_keys(array_map('strtolower', $ref->getDependencies()));
        $dependencies = $this->patchDependencies($extension, $dependencies);
        $dependencies = array_filter($dependencies, function ($dependency) use ($self) {
            return $self->checkSharedExtension($dependency);
        });
        $self->map[$extension] = $dependencies;
    }

    /**
     * Function to write the map of shared extensions and their dependent extensions.
     */
    public function write() {
        $path = $_SERVER['argv'][1];
        $this->parseMap($path);
        $extensions = array_map('strtolower', $this->getSharedExtensions());
        foreach ($extensions as $extension) {
            try {
                $this->addExtensionToMap($extension);
            } catch (ReflectionException $e) {

            }
        }
        $map_string = '';
        foreach($this->map as $extension => $dependencies) {
            $map_string .= $extension . ': ' . implode(' ', $dependencies) . PHP_EOL;
        }
        file_put_contents($path, $map_string);
    }
}

$extension_map = new ExtensionMap();
$extension_map->write();
