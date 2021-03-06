# Best of JavaScript Serverless

Serverless functions developed and hosted using [Vercel serverless functions](https://vercel.com/docs/v2/serverless-functions/introduction.amp)

## Functions

### `project-details` end-point

Return the details about a project, for project details page

`/api/project-details?fullName=reduxjs/redux`

### `project-readme` end-point

Return the content of the README.md, formatted as HTML code

`/api/project-readme?fullName=reduxjs/redux`

### `package-monthly-downloads` end-point

Return the number of monthly downloads on NPM

`/api/package-monthly-downloads?packageName=redux`

### `project-badge` end point

Provide data to display customized badges using https://shields.io/ service

`/api/project-badge?fullName=reduxjs/redux&since=weekly`

More details about the badges: https://github.com/bestofjs/bestofjs-webui/issues/79

## Development workflow

Local development:

```shell
now dev
```

Deploy the "preview":

```shell
now
```

Deploy to production:

```shell
now --prod
```
