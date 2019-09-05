import platform
import os

current_os = platform.system()
php_version = os.environ['php-version']
if current_os == 'Linux':
	os.system("sudo chmod a+x ./src/linux.sh")
	os.system("./src/linux.sh " + php_version)
elif current_os == 'Darwin':
	os.system("sudo chmod a+x ./src/darwin.sh")
	os.system("sh ./src/darwin.sh " + php_version)
elif current_os == 'Windows':
	os.system("powershell .\src\windows.ps1 -version " + php_version)
