#!/bin/bash
BUILDDIR=/tmp/twiticabuild
rm -rf $BUILDDIR
cd `dirname $0`
mkdir $BUILDDIR
cp -r * $BUILDDIR
rm -rf $BUILDDIR/twitter-text-js/{lib,pkg,test,.git,.gitignore,.gitmodules,README.md,Rakefile}
rm $BUILDDIR/release.sh
/opt/local/share/google_appengine/appcfg.py update ~/Documents/twitica-appengine
CWD=`pwd`
rm ../twitica-full.zip
(cd $BUILDDIR/..; zip -r $CWD/../twitica-full.zip `basename $BUILDDIR`)