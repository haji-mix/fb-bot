#!/bin/bash

# Function to install packages for Alpine Linux
install_alpine() {
    apk update && apk upgrade
    apk add --no-cache nodejs npm python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev
}

# Function to install packages for Debian-based distributions
install_debian() {
    apt-get update && apt-get upgrade -y
    apt-get install -y nodejs npm python3 make g++ pkg-config libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-turbo8-dev libgif-dev
}

# Detect the package manager and install packages
if command -v apk &> /dev/null; then
    echo "Detected Alpine Linux"
    install_alpine
elif command -v apt-get &> /dev/null; then
    echo "Detected Debian-based distribution"
    install_debian
else
    echo "Unsupported distribution"
    exit 1
fi
