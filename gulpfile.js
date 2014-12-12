
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
	del(['dist', 'public'], cb);
});

gulp.task('lint', function() {
  return gulp.src(['./lib/*.js', './app/*.js', './conf/*.js', './bin/*.js'])
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

gulp.task('auto-ut', ['unit-test'], function(){
	gulp.watch(['lib/*.js', 'conf/*.js', 'spec/*.js'], ['unit-test']);
});

gulp.task('build', ['build-html', 'build-js', 'build-css', 'build-img'], function(){
});

gulp.task('build-html', function(){
	gulp.src('./app/index.html')
		.pipe(gulp.dest('./public'));
});

gulp.task('build-js', ['browserify'], function(){
	gulp.src('dist/main.js')
	    //.pipe(uglify())
	    .pipe(gulp.dest('./public'));
});

gulp.task('browserify', function(){
    return browserify('./app/main.js')
	    .bundle()
	    .pipe(source('main.js'))
	    .pipe(gulp.dest('./dist'));
});

gulp.task('build-css', function(){
	return gulp.src(['./app/main.css', './app/*.css'])
		.pipe(concat('main.css'))
		.pipe(myth())
		//.minifycss(({keepBreaks:true}))
		.pipe(gulp.dest('./public'));
});

gulp.task('build-img', function(){
	gulp.src(['./app/img/*'])
		//.pipe(imagemin())
		.pipe(gulp.dest('./public/img/'));
});

// start a server
gulp.task('e2e-test', function () {
    return gulp.src('test/test_e2e.js')
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
	        'client:js': require("fs").readFileSync("./tools/browser-sync-reloader.js", "utf-8") // Link to your file
	    }
	});
	
	// proxy to casino server started in unit-test
	return browsersync({
        proxy: 'localhost:7000'
    });
    
	// we will not use the static file, as we need the socket.io client js code 
    return browsersync({
        server: {
            baseDir: './public'
        }
    });
});

gulp.task('auto-e2e', ['build', 'e2e-test', 'browser-sync'], function(){
	
	gulp.watch(['lib/*.js', 'conf/*.js', 'test/test_e2e.js'], ['e2e-test']);
	
	gulp.watch(['./app/*.html'], ['build-html', browsersync.reload]);
	gulp.watch(['./app/main.js', './app/js/*.js', './lib/*.js'], ['build-js', browsersync.reload]);
	gulp.watch(['./app/css/*.css'], ['build-css', browsersync.reload]);
	gulp.watch(['./app/img/*'], ['build-img', browsersync.reload]);
});
