require 'rubygems'
require 'bundler'

begin
  Bundler.setup(:default, :development)
rescue Bundler::BundlerError => e
  $stderr.puts e.message
  $stderr.puts "Run `bundle install` to install missing gems"
  exit e.status_code
end

require 'aws-sdk'
require 'dotenv'

# Load environment variables from .env file
# REGION:             us-west-2
# ACCESS_KEY_ID:      your access key
# SECRET_ACCESS_KEY:  your secret key
Dotenv.load

desc "Create website bucket on s3"
task :create do
  client = Aws::S3::Client.new(region: ENV['REGION'],
                               access_key_id: ENV['ACCESS_KEY_ID'],
                               secret_access_key: ENV['SECRET_ACCESS_KEY'])

  client.delete_object(bucket: ENV['bucket'], key: 'index.html')
  client.delete_bucket(bucket: ENV['bucket'])

  client.create_bucket(bucket: ENV['bucket'])

  client.put_bucket_website({
    bucket: ENV['bucket'],
    website_configuration: {
      index_document: {
        suffix: "index.html",
      }
    }
  })

  client.put_bucket_policy({
    bucket: ENV['bucket'],
    policy: {
      "Version" => "2012-10-17",
      "Statement" => [
        {
          "Sid"       => "AddPerm",
          "Effect"    => "Allow",
          "Principal" => "*",
          "Action"    => "s3:GetObject",
          "Resource"  => "arn:aws:s3:::#{ENV['bucket']}/*"
        }
      ]
    }.to_json
  })

  client.put_object(bucket: ENV['bucket'], key: 'index.html', body: "Hello World!")
end

desc "Deploy website to s3"
task :deploy do
  puts "Building website"
  `jekyll build`

  puts "Deploying website"
  require 'aws-sdk'
  s3 = Aws::S3::Resource.new(region: ENV['REGION'],
                             access_key_id: ENV['ACCESS_KEY_ID'],
                             secret_access_key: ENV['SECRET_ACCESS_KEY'])

  build = Pathname.new("_site")

  Dir.glob("_site/**/*.*").each do |file|
    # Glob can still sometimes pick up directories
    next if File.directory?(file)

    source = Pathname.new(file)
    destination = source.relative_path_from(build)
    object = s3.bucket(ENV['BUCKET']).object(destination.to_s)
    object.upload_file(source)
  end

  puts "Website deployed"
end