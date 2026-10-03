---
title: Print only the last block from a log
date: 2024-09-21
summary: 'awk that keeps the last block between two marker lines, and a carriage return that broke shell arithmetic.'
topics: [Command line and Git]
---

Some of my scripts on a game server send a console command and then read the answer from the server log. The answer is a block of lines between a start line and an end line, and the log keeps every earlier block too. The scripts needed only the newest block, without the marker lines.

A couple of `tac` pipelines didn't work, so I went back to awk. It does this in one pass. Collect each block, keep the last one, print it at the end:

```sh
awk -v start='START MARKER' -v end='END MARKER' '
  $0 ~ start { block = ""; inside = 1; next }
  $0 ~ end   { if (inside) last = block; inside = 0; next }
  inside     { block = block $0 "\n" }
  END        { printf "%s", last }
' server.log
```

Reset `block` on every start line. My first working version didn't, and it only looked right because my test log had a single block in it.

Pass the patterns with `-v`. Pasting shell variables into the awk program inside the quotes works until a pattern contains a quote or a slash.

### The invisible \r

Next, a script pulled a number out of that block and did math with it:

```
invalid arithmetic operator (error token is "
```

The error token looks empty. It's a carriage return at the end of the captured value. Whatever produced that output used `\r\n` line endings. Strip it before you use the value:

```sh
count=$(sed -n 's/^Players: //p' last_block.txt | tr -d '\r')
echo $(( count + 1 ))
```
