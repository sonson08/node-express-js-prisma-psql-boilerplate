const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const sampleRouter = require('./routes/sample');
const summariesRouter = require('./routes/summaries');
const apiErrorHandler = require('./middleware/apiErrorHandler');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/sample-call', sampleRouter);
app.use('/api/v1/summaries', summariesRouter);

app.use((req, res, next) => {
  next(createError(404));
});

// Registered before the HTML error handler so /api clients get JSON instead of a rendered error page.
app.use('/api', apiErrorHandler);

app.use((err, req, res, next) => {
  // Error details are only exposed in development to avoid leaking internals in production.
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
