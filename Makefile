CC = ~/closure-compiler/compiler.jar
TARGETS = mac chrome
FLAGS = --compilation_level ADVANCED_OPTIMIZATIONS
BUILDDIR = /tmp/twiticabuild
TMPDIR := ${foreach dir,$(TARGETS),$(BUILDDIR)-$(dir)}
APPCFG = /opt/local/share/google_appengine/appcfg.py

ifdef DEBUG
	FLAGS += --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER
endif

all: | build mac-install
build: dist-mac ../twitica-full.zip
debug: FLAGS += --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER
debug: build
options_externs_list = ${wildcard extern/*} twplus/sha1.js twplus/oauth.js
options_file_list = twplus/twitter.js twplus/options.js
options_EXTERNS = ${foreach extern,$(options_externs_list),--externs $(extern)}
options_ARG = ${foreach file,$(options_file_list),--js $(file)}
twplus/options.compiled.js: twplus/options.js
	java -jar $(CC) $(FLAGS) $(options_EXTERNS) $(options_ARG) --js_output_file $@ 2>&1 \
		| grep -E 'twitter\.js|options\.js|ERROR|Exception' || true

twitica_externs_list = ${wildcard extern/*} twplus/sha1.js twplus/oauth.js \
	addAnimationFrame.js gmaps.js twitter-text-js/twitter-text.js shadowbox/shadowbox.js \
	easing.js mousewheel.js query.js
twitica_file_list = twplus/twitter.js imageloader.js twitica.js
twitica_EXTERNS = ${foreach extern,$(twitica_externs_list),--externs $(extern)}
twitica_ARG = ${foreach file,$(twitica_file_list),--js $(file)}

twitica.compiled.js.chrome twitica.compiled.js.mac: twitica.js
	java -jar $(CC) --define TwPlusAPI=\"$(TARGET)\" $(FLAGS) $(twitica_EXTERNS) \
		$(twitica_ARG) --js_output_file $@ 2>&1 \
		| grep -E 'twitter\.js|imageloader\.js|twitica\.js|ERROR|Exception' || true

$(TMPDIR): twplus/options.compiled.js
	rm -rf $(DIST) || true
	mkdir $(DIST)
	-cp -r * $(DIST)/
	rm -rf $(DIST)/twitter-text-js/{lib,pkg,test,.git,.gitignore,.gitmodules,README.md,Rakefile}
	rm -rf $(DIST)/extern
	rm $(DIST)/{Makefile,{twitica,imageloader}.js,twplus/{options,twitter}.js,app.yaml}
	mv $(DIST)/twitica.compiled.js.$(TARGET) $(DIST)/twitica.compiled.js
	rm $(DIST)/twitica.compiled.js.* || true

mac: TARGET = mac
mac: twitica.compiled.js.mac
mac-appengine: mac
	-mkdir ${abspath $(DIST)/..}
	cp app.yaml ${abspath $(DIST)/..}
dist-mac: DIST = $(BUILDDIR)-mac/twitica
dist-mac: TARGET = mac
dist-mac: | mac mac-appengine /tmp/twiticabuild-mac
	rm -rf $(DIST)/twplus
mac-install: DIST = $(BUILDDIR)-mac/twitica
mac-install: dist-mac
	$(APPCFG) update ${abspath $(DIST)/..}


chrome: TARGET=chrome
chrome: twplus/options.compiled.js twitica.compiled.js.chrome
../twitica-full.zip: TARGET = chrome
../twitica-full.zip: DIST = $(BUILDDIR)-chrome
../twitica-full.zip: | chrome /tmp/twiticabuild-chrome
	(cd ${abspath $(DIST)/..}; zip -r ${abspath $(CURDIR)/../twitica-full.zip} ${notdir $(DIST)})
	@echo "\n\nDon't forget to upload to Chrome Web Store!"

buildclean:
	rm twitica.compiled.js.{mac,chrome} twplus/options.compiled.js || true
clean: buildclean
	rm -rf $(BUILDDIR)-{mac,chrome} || true
	rm ../twitica-full.zip || true
.PHONY: all build build-mac build-chrome debug mac mac-appengine dist-mac mac-install chrome buildclean clean