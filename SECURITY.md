# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x (latest release) | Yes |
| older | No |

## What this app does and does not do

PNW Home is a static Tizen web app. It makes outbound requests only to Adobe Fonts (Futura PT) and Google Fonts (Baumans). It has no server, stores nothing but the last focused tile in `localStorage`, and uses only the `application.launch`, `application.info` and `internet` privileges.

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on this repository. If that is unavailable, contact the maintainer through the [poyfather](https://github.com/poyfather) profile with "PNW Home security" in the subject.

Include what you found, how to reproduce it, and the TV model and Tizen version if relevant.

## Response

You will get an acknowledgement within 7 days and a fix or a decision within 30 days. Fixes ship as a new tagged release with a note in `CHANGELOG.md`. Credit is given in the release notes unless you ask otherwise.
