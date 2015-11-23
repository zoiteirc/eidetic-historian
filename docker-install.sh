#!/usr/bin/env bash

# docker-engine
sudo apt-key adv --keyserver hkp://pgp.mit.edu:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
sudo bash -c 'echo deb https://apt.dockerproject.org/repo ubuntu-trusty main > /etc/apt/sources.list.d/docker.list'
sudo apt-get update
sudo apt-get -y install docker-engine

# docker-compose
sudo bash -c 'curl -L https://github.com/docker/compose/releases/download/1.5.0rc2/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose'
sudo chmod +x /usr/local/bin/docker-compose

sudo usermod -aG docker vagrant