const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    districtId: dbObject.district_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

const authentication = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', (error, payLoad) => {
      if (error) {
        response.status(401)
        response.send('Invalid  JWT Token')
      } else {
        next()
      }
    })
  }
}

// API 1

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `
  SELECT * 
  FROm user 
  WHERE
  username = "${username}"
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password)
    if (isPasswordCorrect === true) {
      const payLoad = {username: username}
      const jwtToken = jwt.sign(payLoad, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// API 2

app.get('/states/', authentication, async (request, response) => {
  const getStatesDetail = `
  SELECT * 
  FROM state
  `
  const stateDetail = await db.all(getStatesDetail)
  response.send(
    stateDetail.map(eachState => convertDbObjectToResponseObject(eachState)),
  )
})

// API 3

app.get('/states/:stateId/', authentication, async (request, response) => {
  const {stateId} = request.params

  const getStateQuery = `
  SELECT * 
  FROM state 
  WHERE 
  state_id = ${stateId}
  `
  const getstate = await db.get(getStateQuery)
  response.send(convertDbObjectToResponseObject(getstate))
})

module.exports = app
