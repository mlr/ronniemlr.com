---
title: Moving Neovim to vim.lsp.enable
date: 2025-10-01
summary: 'A Homebrew upgrade took Neovim from 0.9.5 to 0.11, which deprecated my lspconfig setup. TypeScript only attached once vim.lsp.enable ran at the top level.'
topics: [Command line and Git]
---

I still run Neovim from a vimrc, with vim-plug and nvim-lspconfig. A `brew upgrade` moved it from 0.9.5 to 0.11, and two things happened.

First, leaving NERDTree threw errors like `module 'vim.uri' not found` and `module 'editorconfig' not found`, with paths that pointed into the 0.9.5 runtime. The Neovim that was running was still the old one, and the errors went away with a fresh start.

Second, the new version warned that the `require('lspconfig')` framework is deprecated. Neovim 0.11 has its own LSP setup with `vim.lsp.config` and `vim.lsp.enable`, and nvim-lspconfig now mostly provides config files for it. This was the old line in my vimrc:

```vim
lua require('lspconfig').ruby_lsp.setup{}
```

My first attempt at the new style wrapped `vim.lsp.enable` in a `FileType` autocmd. `:checkhealth vim.lsp` then listed `ts_ls` under enabled configurations, but it never attached to a buffer. Calling it at the top level fixed that:

```vim
lua << EOF
vim.lsp.config('ts_ls', { cmd = { 'typescript-language-server', '--stdio' } })
vim.lsp.enable({ 'ts_ls', 'ruby_lsp' })
EOF
```

After that, checkhealth showed `ts_ls` with one attached buffer. `vim.lsp.enable` sets up its own autocmds to start servers for matching file types. When it runs inside a `FileType` autocmd, it's probably too late for the buffer that triggered it.

Two more details tripped me up. `vim.lsp.enable` takes a table when you enable several servers, because a second string argument is read as a boolean flag, not another server name. And with nvim-lspconfig installed, `vim.lsp.enable('ts_ls')` is enough by itself, since the plugin ships the config.
