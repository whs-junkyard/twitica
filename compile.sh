#!/bin/bash
cd `dirname $0`
CC=~/closure-compiler/compiler.jar
if [ ! -f $CC ]; then
	echo "You need to install Google Closure compiler at "$CC
	exit 1
fi
BCCARG="--compilation_level ADVANCED_OPTIMIZATIONS --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER $*"
CCARG=$BCCARG
for i in extern/* twplus/{sha1,oauth}.js addAnimationFrame.js gmaps.js \
		twitter-text-js/twitter-text.js shadowbox/shadowbox.js \
		easing.js mousewheel.js query.js
do
	CCARG=$CCARG" --externs $i"
done
for i in twplus/twitter.js imageloader.js twitica.js
do
	CCARG=$CCARG" --js $i"
done
CMD="java -jar $CC $CCARG --js_output_file twitica.compiled.js"
echo $CMD
$CMD 2>&1 | grep -E 'twitter\.js|imageloader\.js|twitica\.js|ERROR|Exception'

CCARG=$BCCARG
for i in extern/* twplus/{sha1,oauth}.js
do
	CCARG=$CCARG" --externs $i"
done
for i in twplus/{twitter,options}.js
do
	CCARG=$CCARG" --js $i"
done
CMD="java -jar $CC $CCARG --js_output_file twplus/options.compiled.js"
echo $CMD
$CMD 2>&1 | grep -E 'twitter\.js|options\.js|ERROR|Exception'