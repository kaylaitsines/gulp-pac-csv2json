# gulp-pac-csv2json

## Options
```sh
  gulp.src('./package.json')
    .pipe(paccsv2json({
      filePath:    '',
      dest:        'assets/',
      output:      'result.json',
      delColumn:   [],
      addColumn:   [],
      delRow:      []
    }));
```
