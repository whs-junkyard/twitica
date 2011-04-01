#!/bin/bash
CC=~/closure-compiler/compiler.jar
BCCARG="--compilation_level ADVANCED_OPTIMIZATIONS --warning_level=QUIET $*"
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
$CMD

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
$CMD