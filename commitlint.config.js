export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'build',
                'ci',
                'chore',
                'revert',
            ],
        ],
        'subject-case': [2, 'never', ['upper-case']],
    },
};
