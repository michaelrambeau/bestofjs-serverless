# Best of JavaScript Serverless

Serverless functions developed and hosted using [Zeit serverless functions](https://zeit.co/docs/v2/serverless-functions/introduction.amp)

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

## Local development

```shell
now dev
```
