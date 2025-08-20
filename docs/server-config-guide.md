# ⚙️ Server Configuration for Clean URLs (History API)

When migrating from hash-based routing (`/#/home`) to clean URLs (`/home`), the web server needs to be configured correctly. This is because when a user directly visits or refreshes a page like `/guest/account`, the browser sends a request to the server for that specific path. Since our project is a Single Page Application (SPA), there is no actual `guest/account.html` file on the server.

The server must be instructed to serve the main `index.html` file for all such requests. The client-side router in `viewManager` will then read the URL path and display the correct view.

Here's how to configure common development and deployment environments.

---

### 1. For Local Development (`live-server`)

The `live-server` package has a built-in option for this.

1.  **Open `package.json`:**
2.  **Modify the `start` script:** Add the `--spa` flag.

    ```json
    "scripts": {
      "start": "live-server --spa=index.html",
      // ... other scripts
    },
    ```

3.  **Run the server:**
    ```bash
    npm start
    ```

Now, `live-server` will redirect all 404 (Not Found) requests to your `index.html` file.

---

### 2. For Deployment on GitHub Pages

GitHub Pages doesn't have a server configuration file, but we can use a clever trick.

1.  **Create a `404.html` file:** In the root directory of your project, create a new file named `404.html`.
2.  **Copy `index.html` content:** Copy the entire content of your `index.html` file and paste it into `404.html`.
3.  **Deploy:** Commit and push this new file along with your other changes.

**How it works:** When GitHub Pages receives a request for a path it can't find (like `your-username.github.io/apna-store/guest/account`), it serves the `404.html` file by default. Since our `404.html` is a copy of `index.html`, it loads our entire application. The JavaScript inside then reads the URL (`/guest/account`) and displays the correct view.

The dynamic `<base href="...">` tag in your `index.html` is crucial for this to work correctly on GitHub Pages.

---

### 3. For Other Hosting Platforms (Netlify, Vercel, etc.)

Modern hosting platforms make this very easy. You typically need to create a simple configuration file in your project's root.

#### Netlify (`_redirects` file)

Create a file named `_redirects` (no extension) in your root directory with the following content:

```
/*    /index.html    200
```

This rule tells Netlify to serve `index.html` for any path that doesn't match an existing file.

#### Vercel (`vercel.json` file)

Create a file named `vercel.json` in your root directory with the following content:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This rule rewrites all incoming requests to point to `index.html`.

By setting up the correct server configuration, you can ensure a seamless user experience with clean, modern URLs.