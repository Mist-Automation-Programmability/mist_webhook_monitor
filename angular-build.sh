#!/bin/bash


cd mist-webhook-monitor
ng build --deploy-url /ng/ 
rm -rf ../src/public/ng/*
cp ./dist/mist-webhook-monitor/* ../src/public/ng
cp ./dist/mist-webhook-monitor/index.html ../src/views/index.html
