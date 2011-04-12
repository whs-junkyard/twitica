CC = ~/closure-compiler/compiler.jar
FLAGS = --compilation_level ADVANCED_OPTIMIZATIONS
BUILDDIR = /tmp/twiticabuild
TMPDIR = /tmp/twiticabuild-chrome /tmp/twiticabuild-appengine ../Twitica\ Mac/twitica
APPCFG = /opt/local/share/google_appengine/appcfg.py

ifdef DEBUG
	FLAGS += --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER
endif

all: | build appengine-install
build: build-appengine build-mac ../twitica-full.zip
debug: FLAGS += --formatting=PRETTY_PRINT --formatting=PRINT_INPUT_DELIMITER
debug: build
options_externs_list = ${wildcard extern/*} twplus/sha1.js twplus/oauth.js
options_file_list = twplus/twitter.js twplus/options.js
options_EXTERNS = ${foreach extern,$(options_externs_list),--externs $(extern)}
options_ARG = ${foreach file,$(options_file_list),--js $(file)}
twplus/options.compiled.js.chrome twplus/options.compiled.js.mac twplus/options.compiled.js.appengine: twplus/options.js
	java -jar $(CC) --define TwPlusAPI=\"$(TARGET)\" $(FLAGS) $(options_EXTERNS) $(options_ARG) --js_output_file $@ 2>&1 \
		| grep -E 'twitter\.js|options\.js|ERROR|Exception' || true

twitica_externs_list = ${wildcard extern/*} twplus/sha1.js twplus/oauth.js \
	addAnimationFrame.js gmaps.js twitter-text-js/twitter-text.js shadowbox/shadowbox.js \
	easing.js mousewheel.js query.js
twitica_file_list = twplus/twitter.js imageloader.js twitica.js
twitica_EXTERNS = ${foreach extern,$(twitica_externs_list),--externs $(extern)}
twitica_ARG = ${foreach file,$(twitica_file_list),--js $(file)}

twitica.compiled.js.chrome twitica.compiled.js.mac twitica.compiled.js.appengine: twitica.js
	java -jar $(CC) --define TwPlusAPI=\"$(TARGET)\" $(FLAGS) $(twitica_EXTERNS) \
		$(twitica_ARG) --js_output_file $@ 2>&1 \
		| grep -E 'twitter\.js|imageloader\.js|twitica\.js|ERROR|Exception' || true

$(TMPDIR) copy-appengine:
	rm -rf $(DIST) || true
	mkdir -p $(DIST)
	-cp -r * $(DIST)/
	rm -rf $(DIST)/twitter-text-js/{lib,pkg,test,.git,.gitignore,.gitmodules,README.md,Rakefile}
	rm -rf $(DIST)/extern
	rm $(DIST)/{Makefile,{twitica,imageloader}.js,twplus/{options,twitter}.js,app.yaml}
	mv $(DIST)/twitica.compiled.js.$(TARGET) $(DIST)/twitica.compiled.js
	mv $(DIST)/twplus/options.compiled.js.$(TARGET) $(DIST)/twplus/options.compiled.js
	rm $(DIST)/twitica.compiled.js.* || true
	rm $(DIST)/twplus/options.compiled.js.* || true

appengine: TARGET = appengine
appengine: twitica.compiled.js.appengine twplus/options.compiled.js.appengine
appengine-prep: appengine
	-mkdir ${abspath $(DIST)/..}
	cp app.yaml ${abspath $(DIST)/..}
build-appengine: DIST = $(BUILDDIR)-appengine/twitica
build-appengine: TARGET = appengine
build-appengine: | appengine appengine-prep copy-appengine
	-rm $(DIST)/manifest.json
	-rm $(DIST)/twplus/{getPIN.js,handler.html}
appengine-install: DIST = $(BUILDDIR)-appengine/twitica
appengine-install: build-appengine
	$(APPCFG) update ${abspath $(DIST)/..}

build-mac: TARGET = mac
build-mac: DIST = ../Twitica\ Mac/twitica/
build-mac: | twplus/options.compiled.js.mac twitica.compiled.js.mac ../Twitica\ Mac/twitica/
	-rm $(DIST)/manifest.json
	-rm $(DIST)/twplus/{getPIN.js,handler.html}
../Twitica\ Mac/build/Release/Twitica\ Mac.app: build-mac
	(cd ../Twitica\ Mac; xcodebuild)

build-chrome: TARGET=chrome
build-chrome: twplus/options.compiled.js.chrome twitica.compiled.js.chrome
../twitica-full.zip: TARGET = chrome
../twitica-full.zip: DIST = $(BUILDDIR)-chrome
../twitica-full.zip: | build-chrome /tmp/twiticabuild-chrome
	(cd ${abspath $(DIST)/..}; zip -r ${abspath $(CURDIR)/../twitica-full.zip} ${notdir $(DIST)})
	@echo "\n\nDon't forget to upload to Chrome Web Store!"

buildclean:
	rm twitica.compiled.js.* twplus/options.compiled.js.* || true
clean: buildclean
	for i in $(TMPDIR); do \
		rm -r $$i || true; \
	done
	rm -r ../Twitica\ Mac/twitica || true
	rm ../twitica-full.zip || true
.PHONY: all build debug build-chrome build-mac \
	appengine appengine-prep build-appengine copy-appengine appengine-install \
	remove-extension-file buildclean clean remove-twplus-file
# sometimes it ask for username
.NOTPARALLEL: appengine-install