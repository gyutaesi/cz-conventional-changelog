'format cjs';

var wrap = require('word-wrap');
var map = require('lodash.map');
var longest = require('longest');
var rightPad = require('right-pad');
var chalk = require('chalk');

var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

var subText = function(target, item, wrapOptions) {
  var text = '  - '.concat(wrap(item, wrapOptions).trim());
  target.push(text);
}

var headerLength = function(answers) {
  return (
    answers.type.length + 2
  );
};

var maxSummaryLength = function(options, answers) {
  return options.maxHeaderWidth - headerLength(answers);
};

var filterSubject = function(subject) {
  subject = subject.trim();
  if (subject.charAt(0).toUpperCase() !== subject.charAt(0)) {
    subject =
      subject.charAt(0).toUpperCase() + subject.slice(1, subject.length);
  }
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function(options) {
  var types = options.types;

  var length = longest(Object.keys(types)).length + 1;
  var choices = map(types, function(type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key
    };
  });

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit) {
      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'list',
          name: 'type',
          message: "Select the type of change that you're committing:",
          choices: choices,
          default: options.defaultType
        },
        {
          type: 'input',
          name: 'subject',
          message: function(answers) {
            return (
              'Title : Write a short, imperative tense description of the change (max ' +
              maxSummaryLength(options, answers) +
              ' chars):\n'
            );
          },
          default: options.defaultSubject,
          validate: function(subject, answers) {
            var filteredSubject = filterSubject(subject);
            return filteredSubject.length == 0
              ? 'subject is required'
              : filteredSubject.length <= maxSummaryLength(options, answers)
              ? true
              : 'Subject length must be less than or equal to ' +
                maxSummaryLength(options, answers) +
                ' characters. Current length is ' +
                filteredSubject.length +
                ' characters.';
          },
          transformer: function(subject, answers) {
            var filteredSubject = filterSubject(subject);
            var color =
              filteredSubject.length <= maxSummaryLength(options, answers)
                ? chalk.green
                : chalk.red;
            return color('(' + filteredSubject.length + ') ' + subject);
          },
          filter: function(subject) {
            return filterSubject(subject);
          }
        },
        {
          type: 'input',
          name: 'cause',
          message: 'Cause (Use "|" to break new line)\n',
          validate: function(reason, answers) {
            return (
              reason.trim().length > 0 ||
              '"Cause" is required'
            );
          }
        },
        {
          type: 'input',
          name: 'solution',
          message: 'Solution (Use "|" to break new line)\n',
          validate: function(reason, answers) {
            return (
              reason.trim().length > 0 ||
              '"Solution" is required'
            );
          }
        },
        {
          type: 'input',
          name: 'issues',
          message: 'Add JIRA issue ID (e.g. "SONOSYNC-123 SONOSYNC-1234"):\n',
          when: function(answers) {
            return answers.type == 'fix';
          },
          validate: function(reason, answers) {
            return (
              reason.trim().length > 0 ||
              '"Issue ID" is required'
            );
          }
        },
        {
          type: 'input',
          name: 'etc',
          message: 'ETC (optional) (Use "|" to break new line)\n',
        }
      ]).then(function(answers) {
        var wrapOptions = {
          trim: true,
          cut: false,
          newline: '\n',
          indent: '',
          width: options.maxLineWidth
        };

        // Hard limit this line in the validate
        var head = `[${answers.type}] ${answers.subject}`

        // Wrap these lines at options.maxLineWidth characters

        var cause = ['Cause : '];
        if (answers.cause.indexOf('|') != -1) {
          answers.cause.split('|').forEach(item => subText(cause, item, wrapOptions));
        } else {
          cause[0] = cause[0].concat(wrap(answers.cause, wrapOptions));
        }

        var solution = ['Solution : '];
        if (answers.solution.indexOf('|') != -1) {
          answers.solution.split('|').forEach(item => subText(solution, item, wrapOptions));
        } else {
          solution[0] = solution[0].concat(wrap(answers.solution, wrapOptions));
        }

        var issues = answers.issues ? `Issue ID : ${wrap(answers.issues, wrapOptions)}` : false;

        var etc = ['ETC : '];
        if (answers.etc.indexOf('|') != -1) {
          answers.etc.split('|').forEach(item => subText(etc, item, wrapOptions));
        } else {
          etc[0] = etc[0].concat(wrap(answers.etc, wrapOptions));
        }
        
        var result = `${head} \n\n${filter([...cause, ...solution, issues, ...etc]).join('\n')}`;
        console.log(result);
        
        commit(result);
      });
    }
  };
};
