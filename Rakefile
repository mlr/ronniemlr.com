require 'rubygems'
require 'bundler'
require 'date'

begin
  Bundler.setup(:default, :development)
rescue Bundler::BundlerError => e
  $stderr.puts e.message
  $stderr.puts "Run `bundle install` to install missing gems"
  exit e.status_code
end

desc "Deploy website to s3"
task :deploy do
  puts "Building website"
  sh "jekyll build"

  puts "Deploying website"
  sh "s3_website push"

  puts "Website deployed"
end

# Start a new entry in _posts with today's date.
#   rake new:note[xargs-once-per-line]
#   rake new:writeup[connecting-rails-to-rds]
def new_entry(slug, extra_front_matter = {})
  abort "Give a slug, for example: rake new:note[my-note]" if slug.to_s.strip.empty?

  slug = slug.strip.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
  path = File.join("_posts", "#{Date.today}-#{slug}.md")
  abort "#{path} already exists" if File.exist?(path)

  # Topics group the archive on the home page; pick from _data/topics.yml.
  front_matter = { "title" => slug.split("-").map(&:capitalize).join(" ") }
    .merge(extra_front_matter)
    .merge("topics" => "[]")
  lines = front_matter.map { |key, value| "#{key}: #{value}" }
  File.write(path, "---\n#{lines.join("\n")}\n---\n\n")
  puts path
end

namespace :new do
  desc "Start a quick note (text only; the title is used in lists)"
  task :note, [:slug] do |_task, args|
    new_entry(args[:slug], "kind" => "note")
  end

  desc "Start a write-up (title and one-line summary on the home page)"
  task :writeup, [:slug] do |_task, args|
    new_entry(args[:slug], "summary" => "''")
  end
end
