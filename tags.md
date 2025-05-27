---
title: Tag Archives
permalink: /tags/index.html
layout: default
---

<section id="hero" class="hero bg-sky-700 dark:bg-sky-900 text-white text-center p-5 pt-12 pb-8 mb-10">
    <h1 class="text-4xl mb-2">Tag Archives</h1>
    <p>Browse posts by topic</p>
</section>
<div class="bg-sky-700 dark:bg-sky-900 bottom-cap reverse-cap mb-10"></div>

<div class="container mx-auto px-6 md:px-10 pb-16">
  <div class="max-w-6xl mx-auto">
    <!-- Tag list -->
    <div class="mb-12">
      <div class="tag-cloud mb-8 text-center">
        {% assign tags = site.posts | map: "tags" | join: "," | split: "," | uniq | sort %}
        {% for tag in tags %}
          <a href="#{{ tag | slugify }}" class="inline-block px-4 py-2 m-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900 hover:text-sky-700 dark:hover:text-sky-400 transition-colors">
            {{ tag | replace: '_', ' ' }}
          </a>
        {% endfor %}
      </div>
    </div>

    <!-- Posts by tag -->
    <div>
      {% assign tags = site.posts | map: "tags" | join: "," | split: "," | uniq | sort %}
      {% for tag in tags %}
        <div id="{{ tag | slugify }}" class="mb-12">
          <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6 pb-2 border-b border-slate-200 dark:border-slate-700">
            {{ tag | replace: '_', ' ' }}
          </h2>

          <ul class="space-y-3">
            {% for post in site.posts %}
              {% if post.tags contains tag %}
                <li class="py-2">
                  <a href="{{ post.url }}" class="group flex items-start">
                    <div class="flex-grow">
                      <span class="block text-lg font-medium text-sky-700 dark:text-sky-400 group-hover:text-sky-800 dark:group-hover:text-sky-300 transition-colors">{{ post.title }}</span>
                      <span class="text-sm text-slate-500 dark:text-slate-400">{{ post.date | date: "%B %-d, %Y" }}</span>
                      {% if post.description %}
                        <p class="text-slate-600 dark:text-slate-300 mt-1">{{ post.description | truncate: 180 }}</p>
                      {% endif %}
                    </div>
                  </a>
                </li>
              {% endif %}
            {% endfor %}
          </ul>
        </div>
      {% endfor %}
    </div>
  </div>

  <div class="text-center mt-10">
    <a href="/" class="inline-block px-6 py-3 bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded-lg transition-colors">Back to Home</a>
  </div>
</div>
