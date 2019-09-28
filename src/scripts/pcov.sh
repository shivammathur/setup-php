git clone --depth=1 https://github.com/krakjoe/pcov.git
(
cd pcov && phpize
./configure --enable-pcov
make
sudo make install
)
