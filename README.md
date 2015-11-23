# Eidetic Historian

A stripped down Node.js implementation of the functionality provided by Bass's
Seen script for eggdrop (available
[here](http://www.egghelp.org/tclhtml/3478-4-9-0-1.htm)).

## Purpose

The project is aimed at users who wish to offer the functionality provided by
Bass's seen script on their channel, but otherwise do not wish to run a full
blown eggdrop bot.

The project also aims to 

## Project Roadmap

Obviously certain functionality, such as recording partyline appearances of
users is not required outside the original eggdrop context. As such, this will
be ignored. In approximate order, the important feature requirements are as
follows:

* Connecting to IRC, basic updating, saving and searching of the database
* Keep track of nick\!user@host for each user currently in each channel (originally provided by eggdrop)
  * Use this information for responses where appropriate
  * Use this information for "kick" entries that are added to the database
* Additional "nice to have" functionality offered by Bass's script, such as flood protection, on-the-fly channel management, quiet channels etc
* Switch to, or additionally offer, a better storage backend, such as MySQL.

## Development

To run the bot, `vagrant up` then run `./start` at the command line to run the
bot inside a node docker container.