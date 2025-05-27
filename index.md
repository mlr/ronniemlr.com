---
title:
permalink: index.html
layout: home
---

{% include hero_header.html %}

<section class="mx-auto px-6 md:px-10 py-12 md:py-16 pb-20 md:pb-24">
  <div class="max-w-6xl mx-auto">
    <div class="mb-10 text-center">
      <h2 class="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">Field Notes</h2>
      <div class="prose prose-slate prose-lg mx-auto max-w-2xl">
        <p>Below are an assortment of notes I found useful enough to write down.</p>
        <p>
            Usually this means it's something novel I encountered during development, or
            a task I wanted to remember or refer to later without googling the information.
        </p>
      </div>
    </div>

    <div class="field-notes-container">
      {% include blog_post_links.html %}
    </div>
  </div>
</section>

{% include consulting_cta.html %}

{% include quick_connect.html %}
