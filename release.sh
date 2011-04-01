#!/bin/bash

BUILDDIR=/tmp/twiticabuild
export BUILDDIR

cd `dirname $0`

function build {
	./compile.sh --define TwPlusAPI=\"$1\" --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER
	if [ "$?" -ne "0" ]; then
		exit $?
	fi
	rm -rf $BUILDDIR 2>/dev/null
	mkdir $BUILDDIR
	cp -r * $BUILDDIR
	rm -rf $BUILDDIR/twitter-text-js/{lib,pkg,test,.git,.gitignore,.gitmodules,README.md,Rakefile}
	rm -rf $BUILDDIR/extern
	rm $BUILDDIR/{{release,compile}.sh,{twitica,imageloader}.js,twplus/{options,twitter}.js}
}

#echo "Building for Mac backend"
#build mac
#rm -rf $BUILDDIR/twplus
#/opt/local/share/google_appengine/appcfg.py update ~/Documents/twitica-appengine


echo "Building for Chrome backend"
build chrome
#CWD=`pwd`
#rm ../twitica-full.zip
#(cd $BUILDDIR/..; zip -r $CWD/../twitica-full.zip `basename $BUILDDIR`)


echo
echo
echo
echo
echo "Post release checklist: Upload to Chrome Web Store."