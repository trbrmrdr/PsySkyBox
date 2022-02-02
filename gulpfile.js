var gulp = require('gulp');
var concat = require('gulp-concat');

var uglify = require('gulp-uglify');
// var babel = require('gulp-babel');

var browserSync = require('browser-sync').create();
const javascriptObfuscator = require('gulp-javascript-obfuscator');

const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');


gulp.task('scripts',  function () {

    console.log(' task -> scripts')

    return  gulp.src('./sources/src/app.js')
    .pipe(webpackStream(webpackConfig), webpack)
    .pipe(gulp.dest('./sources/dist/'));

    return gulp.src([
        //   './lib/*.js'// путь к папке со скриптами
        // "./js/settings.js",

        "./sources/src/app.js"

    ])
        // .pipe(babel({
        //     presets: ["@babel/preset-env"]
        // }))
        // .pipe(browserify())

        // .pipe(javascriptObfuscator())
        // .pipe(uglify())

        .pipe(concat('main.js')) // в какой файл объединить
        .pipe(gulp.dest('./sources/dist/'))

    //.pipe(browserSync.reload())
});

gulp.task('js_watch', gulp.series('scripts', function (done) {
    console.log(' task -> js_watch')
    browserSync.reload();
    done()


}));

gulp.task('server', gulp.series('scripts', function (done) {

    console.log(' task -> server')

    browserSync.init({
        server: {
            baseDir: "./sources/",
            index: "index.html"
        },
    });


    gulp.watch("./sources/lib/*.js").on('change', gulp.series('js_watch'));
    gulp.watch("./sources/src/*.js").on('change', gulp.series('js_watch'));
    gulp.watch("./sources/*").on('change', gulp.series('js_watch'));
    gulp.watch("*.js").on('change', browserSync.reload);

    // gulp.watch("./public/*.html").on('change', browserSync.reload);
    // gulp.watch("./public/data/ver_*/*.*").on('change', browserSync.reload);
}));

gulp.task('default', gulp.series('server'));






gulp.task('release_src', function () {

    return gulp.src([
        "./public/lib/dragonBones.js",
        "./public/lib/listener.js",

        "./public/lib/Const.js",
        "./public/lib/Assets.js",

        "./public/lib/Stars.js",
        "./public/lib/ClipMask.js",
        "./public/lib/Room.js",
        "./public/lib/Tablo.js",
        "./public/lib/Bang.js",

        "./public/lib/main.js"
    ])

        // .pipe(javascriptObfuscator())
        // .pipe(uglify())

        .pipe(concat('main.js'))
        .pipe(gulp.dest('./public/dist/'))

});


const shell = require('gulp-shell');
gulp.task('release', gulp.series('release_src', function (done) {
    shell.task([
        'firebase deploy'
    ])()
    done()
})
)