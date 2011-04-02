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
twplus/options.compiled.js: twplus/options.js
	java -jar $(CC) $(FLAGS) $(options_EXTERNS) $(options_ARG) --js_output_file $@ 2>&1 \
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

$(TMPDIR): twplus/options.compiled.js
	rm -rf $(DIST) || true
	mkdir $(DIST)
	-cp -r * $(DIST)/
	rm -rf $(DIST)/twitter-text-js/{lib,pkg,test,.git,.gitignore,.gitmodules,README.md,Rakefile}
	rm -rf $(DIST)/extern
	rm $(DIST)/{Makefile,{twitica,imageloader}.js,twplus/{options,twitter}.js,app.yaml}
	mv $(DIST)/twitica.compiled.js.$(TARGET) $(DIST)/twitica.compiled.js
	rm $(DIST)/twitica.compiled.js.* || true

remove-twplus-file:
	rm -rf $(DIST)/twplus/{getPIN.js,handler.js,options.*,twitter.js,handler.html}

appengine: TARGET = appengine
appengine: twitica.compiled.js.appengine
appengine-prep: appengine
	-mkdir ${abspath $(DIST)/..}
	cp app.yaml ${abspath $(DIST)/..}
build-appengine: DIST = $(BUILDDIR)-appengine/twitica
build-appengine: TARGET = appengine
build-appengine: | appengine appengine-prep /tmp/twiticabuild-appengine remove-twplus-file
appengine-install: DIST = $(BUILDDIR)-appengine/twitica
appengine-install: dist-appengine
	$(APPCFG) update ${abspath $(DIST)/..}

build-mac: TARGET = mac
build-mac: DIST = ../Twitica\ Mac/twitica/
build-mac: | twitica.compiled.js.mac ../Twitica\ Mac/twitica/ remove-twplus-file
../Twitica\ Mac/build/Release/Twitica\ Mac.app: build-mac
	(cd ../Twitica\ Mac; xcodebuild)

build-chrome: TARGET=chrome
build-chrome: twplus/options.compiled.js twitica.compiled.js.chrome
../twitica-full.zip: TARGET = chrome
../twitica-full.zip: DIST = $(BUILDDIR)-chrome
../twitica-full.zip: | build-chrome /tmp/twiticabuild-chrome
	(cd ${abspath $(DIST)/..}; zip -r ${abspath $(CURDIR)/../twitica-full.zip} ${notdir $(DIST)})
	@echo "\n\nDon't forget to upload to Chrome Web Store!"

buildclean:
	rm twitica.compiled.js.* twplus/options.compiled.js || true
clean: buildclean
	for i in $(TMPDIR); do \
		rm -r $$i || true; \
	done
	rm -r ../Twitica\ Mac/twitica || true
	rm ../twitica-full.zip || true
.PHONY: all build debug build-chrome build-mac \
	appengine appengine-prep build-appengine appengine-install buildclean clean remove-twplus-file