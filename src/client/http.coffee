# Serve Views
# -----------
# Extend Node's HTTP http.ServerResponse object to serve views either from a cache (in production)
# or by generating them on-the-fly (in development)
# Note: Even though this is exactly what Express.js does, it's not best practice to extend Node's native
# objects so I may change this in the future

fs = require('fs')
pathlib = require('path')
http = require('http')
view = require('./view')

# Cache each view in RAM when packing assets (i.e. production mode)
cache = {}

# Get hold of the 'response' object so we can extend it later
res = http.ServerResponse.prototype


exports.init = (root, clients, options) ->

  # Append the 'serveClient' method to the HTTP Response object
  res.serveClient = (name) ->

    self = this

    sendHTML = (html) ->
      self.writeHead(200, {
        'Content-Length': Buffer.byteLength(html),
        'Content-Type': 'text/html'
      })
      self.end(html)

    client = typeof(name) == 'string' && clients[name]
    throw new Error('Unable to find single-page client: ' + name) unless client?

    # Load packed HTML file
    if client.pack

      # Return from in-memory cache if possible
      unless cache[name]
        fileName = pathlib.join(root, options.dirs.assets, client.name, client.id + '.html')
        cache[name] = fs.readFileSync(fileName, 'utf8')
      
      # Send to browser   
      sendHTML(cache[name])

    # Generate View from scratch in development 
    else
      view(root, client, options, sendHTML)

  # Alias res.serveClient to keep compatibility with existing apps
  res.serve = res.serveClient
