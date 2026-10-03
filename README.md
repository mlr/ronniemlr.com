## Hey there!

You've stumbled across the source repository of my personal website.
You can view the website at [ronniemlr.com](http://ronniemlr.com/).
This website is built with [jekyll](https://jekyllrb.com/)
and will remain open source here on GitHub.

### Posting

Entries live in `_posts`. The home page shows the newest entry in full, the next
six in two columns, then an archive that readers can view by topic or by date.

Front matter keys:

| Key       | Use                                                                 |
| --------- | ------------------------------------------------------------------- |
| `kind`    | `note` for a short entry (text only), or none for a write-up.       |
| `summary` | One line for a write-up on the home page. Without it, the first paragraph shows. |
| `topics`  | A list from `_data/topics.yml`, for example `topics: [AWS, Databases]`. Entries with no topic show under "Other". |

Start a new entry with today's date:

```
bundle exec rake new:note[xargs-once-per-line]
bundle exec rake new:writeup[connecting-rails-to-rds]
```

To add a topic, add it to `_data/topics.yml`. The archive lists topics by number of entries, largest first.

Drafts in `_drafts` show only when you run `bundle exec jekyll serve --drafts`.
