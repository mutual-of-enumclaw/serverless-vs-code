## Serverless Framework Extension for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/MutualofEnumclaw.serverless-vs-code.svg)](https://marketplace.visualstudio.com/items?itemName=MutualofEnumclaw.serverless-vs-code)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/MutualofEnumclaw.serverless-vs-code.svg)](https://marketplace.visualstudio.com/items?itemName=MutualofEnumclaw.serverless-vs-code)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/MutualofEnumclaw.serverless-vs-code.svg)](https://marketplace.visualstudio.com/items?itemName=MutualofEnumclaw.serverless-vs-code)


This extension enables an integration of Serverless projects with VSCode. It allows exploration and 
debugging of serverless functions

## Installation

In order to install an extension you need to open the extension palette and search for serverless-vscode.
You can then install it.

That means, that Serverless must be a development dependency of the project itself. A subsequent
version of the extension will also support the globally installed Serverless framework and a
configuration for that.

## Usage

### The Serverless outline

As soon as you have added a Serverless project to your workspace, you can select the `serverless` icon
on the activity bar.  This will open up a view which will find all your serverless.yml files and display
the functions and environment variables for each function.  Expanding the functions will give you the ability
to add in tests, and debug those tests in vscode.

##### Variable resolution (Resolve)

Variable resolution is performed by the serverless framework.  It is recommended that you use the
`@moe-tech/serverless-plugin-local-env` plugin, as it will resolve resource references.

#### Adding Test Cases

Under each function are the `Environment` and `Tests` sections.  Hovering your mouse over the tests
will reveal an action to the right to be able to add or modify your tests.

##### Debug function

Debugs the selected function's test with `serverless invoke local` command.
