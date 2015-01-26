
var gulp = require('gulp'),
	del = require('del'),
	jshint = require('gulp-jshint'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	myth = require('gulp-myth'),
	minifycss = require('gulp-minify-css'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	//imagemin = require('gulp-imagemin'),
	browsersync = require('browser-sync'),
	//reporters = require('jasmine-reporters'),
	jasmine = require('gulp-jasmine');

gulp.task('default', ['clean', 'build'], function(){
	//gulp.start('build');
});

gulp.task('clean', function(cb) {
	del(['tmp', 'www/*'], cb);
});

gulp.task('lint', function() {
  return gulp.src(['lib/*.js', 'wwwsrc/*.js', 'conf/*.js', 'bin/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('unit-test', function () {
    return gulp.src('spec/*.js')
        .pipe(jasmine({
        	//isVerbose: true,
        	includeStackTrace:true
            //reporter: new reporters.JUnitXmlReporter()
        }));
});

gulp.task('build', ['build-html', 'build-js', 'build-css', 'build-img'], function(){
});

gulp.task('build-html', function(){
	gulp.src('wwwsrc/index.html')
		.pipe(gulp.dest('www'));
});

gulp.task('build-js', ['lint', 'browserify'], function(){
	gulp.src('wwwsrc/js/*')
		.pipe(gulp.dest('www/js/'));
	
	gulp.src('tmp/main.js')
	    //.pipe(uglify())
	    .pipe(gulp.dest('www'));
});

gulp.task('browserify', function(){
    return browserify('./wwwsrc/main.js')
	    .bundle()
	    .pipe(source('main.js'))
	    .pipe(gulp.dest('tmp'));
});

gulp.task('build-css', function(){
	return gulp.src(['wwwsrc/main.css', 'wwwsrc/*.css'])
		.pipe(concat('main.css'))
		.pipe(myth())
		//.minifycss(({keepBreaks:true}))
		.pipe(gulp.dest('www'));
});

gulp.task('build-img', function(){
	gulp.src(['wwwsrc/img/*'])
		//.pipe(imagemin())
		.pipe(gulp.dest('www/img/'));
});

// start a server
gulp.task('restart-casino-server', function () {
    return gulp.src('spec/e2e/test_service.js')
        .pipe(jasmine({
        	//isVerbose: true,
        	includeStackTrace:true
            //reporter: new reporters.JUnitXmlReporter()
        }));
});

gulp.task('browser-sync', function() {
	// reuse the same page
	// see: https://github.com/shakyShane/browser-sync/issues/84
	browsersync.use({
	    plugin: function () { /* noop */},
	    hooks: {
	        'client:js': require("fs").readFileSync("tools/browser-sync-reloader.js", "utf-8") // Link to your file
	    }
	});
	
	// proxy to casino server started in unit-test
	return browsersync({
        proxy: 'localhost:7000'
    });
    
	// we will not use the static file, as we need the socket.io client js code 
    return browsersync({
        server: {
            baseDir: './www'
        }
    });
});

gulp.task('auto-ut', ['unit-test', 'build'], function(){
	gulp.watch(['lib/*.js'], ['unit-test', 'build-js']);
	gulp.watch(['conf/*.js', 'spec/*.js'], ['unit-test']);

	gulp.watch(['wwwsrc/main.js', 'wwwsrc/js/*.js'], ['build-js']);
	gulp.watch(['wwwsrc/*.html'], ['build-html']);
	gulp.watch(['wwwsrc/main.css', 'wwwsrc/css/*.css'], ['build-css']);
	gulp.watch(['wwwsrc/img/*'], ['build-img']);
});

gulp.task('auto-e2e', ['build', 'restart-casino-server', 'browser-sync'], function(){
	
	gulp.watch(['conf/*.js', 'spec/e2e/test_service.js'], ['restart-casino-server', 'build-js']);
	gulp.watch(['lib/*.js'], ['restart-casino-server', 'build-js']);
	
	gulp.watch(['wwwsrc/main.js', 'wwwsrc/js/*.js'], ['build-js', browsersync.reload]);
	gulp.watch(['wwwsrc/*.html'], ['build-html', browsersync.reload]);
	gulp.watch(['wwwsrc/main.css', 'wwwsrc/css/*.css'], ['build-css', browsersync.reload]);
	gulp.watch(['wwwsrc/img/*'], ['build-img', browsersync.reload]);
});
