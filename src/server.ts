import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import moment from "moment";
import queryString from 'query-string'

const app = express()
app.use(express.urlencoded())
app.use(cookieParser())

const key = process.env.SECRET_KEY
const username = process.env.USERNAME
const password = process.env.PASSWORD
const domain = process.env.DOMAIN

if (!key) throw "SECRET_KEY variable is not set"
if (!username) throw "USERNAME variable is not set"
if (!password) throw "PASSWORD variable is not set"
if (!domain) throw "DOMAIN variable is not set"

const viewport = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
const css = `<style>
        body{
            background-color: #242424;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        form{
        border-radius: 5px;
            font-family: "Avenir Next",serif;
            background-color: #444444;
            color: white;
            padding: 4rem;
            filter: drop-shadow(0 0 0.75rem #000000);
            width: 13rem;
            height: 23rem;
        }
        input[type=text],input[type=password], select {
          width: 100%;
          padding: 12px 20px;
          margin: 8px 0;
          display: inline-block;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-sizing: border-box;
        }
        input[type=submit] {
          width: 100%;
          background-color: #666688;
          color: white;
          padding: 14px 20px;
          margin: 8px 0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        h1, h2, h3, h4, h5{
            font-family: Arial;
        }
        </style>`

const logoutPage = `<html lang="en">
    <head>
        <title>Log out</title>
        ${css}
        ${viewport}
    </head>
    <body>
        <form action="/__login?logout=true" method="post">
        <h2>Log out</h2>
        <h4>${domain}</h4>
          <input type="submit" value="Log out">
        </form>
    </body>
</html>`

const loginPage = `<html lang="en">
    <head>
        <title>Login</title>
        <script>
        const wrongpass=()=>{
            if(window.location.search.includes("wrongpass=true"))
                document.getElementById("validation").innerText += 'Wrong username/password'
                }
        </script>
        ${css}
        ${viewport}
    </head>
    <body onload="wrongpass()">
        <form action="/__login" method="post">
        <h2>Log in</h2>
        <h4>${domain}</h4>
          <label for="username">Username</label><br>
          <input type="text" id="username" name="username"><br><br>
          <label for="password">Password</label><br>
          <input type="password" id="password" name="password"><br><br>
          <input type="submit" value="Login">
          <div style="height: 1rem; color: red;" id="validation"></div>
        </form>
    </body>
</html>`

app.get("/__login", async (req, res) => {
  const token = req.cookies["es-auth"]
  jwt.verify(token, key, function (err: any, decoded: any) {
    if (!err && decoded && decoded.username === username && decoded.valid > moment().unix())
      res.send(logoutPage)
    else
      res.send(loginPage)
  })
})

app.post('/__login', (req, res) => {
  if (req.url === "/__login?logout=true") {
    res.cookie('es-auth', '', {domain, maxAge: 0})
    res.redirect("/__login")
    return
  }
  const redirectUrl = req.header("Referer")
  const [url, query] = redirectUrl?.split("?") as string[]
  const queries = queryString.parse(query)
  if (req.body.username !== username || req.body.password !== password) {
    const redirectPath = queries.redirect ? `redirect=${queries.redirect}&` : ''
    const redirectTo = `${url}?${redirectPath}wrongpass=true`
    res.redirect(redirectTo)
    return
  }
  const token = jwt.sign({username: username, valid: moment().add(1, "days").unix()}, key);
  res.cookie('es-auth', token, {domain})
  res.redirect(queries.redirect as string ?? "/__login")
})

app.get("/__loggedin", (req, res) => {
  const token = req.cookies["es-auth"]
  const path = req.header('x-forwarded-uri') as string
  const proto = req.header('x-forwarded-proto') as string
  const host = req.header('x-forwarded-host') as string
  const redirect = `${proto}://${host}/__login?redirect=${encodeURI(path)}`
  jwt.verify(token, key, function (err: any, decoded: any) {
    if (err && req.method === 'GET' && req?.headers?.accept?.includes('html'))
      res.redirect(302, redirect)
    else if (decoded && decoded.username === username && decoded.valid < moment().unix())
      res.redirect(302, redirect)
    else if (decoded && decoded.username === username)
      res.sendStatus(200)
    else
      res.sendStatus(401)
  })
})

console.log("Login server listening on port 4321")
app.listen(4321)