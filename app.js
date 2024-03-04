const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "rajkumar@1");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "rajkumar@1", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
  SELECT
    *
  FROM
    state;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((each) => ({
      stateId: each.state_id,
      stateName: each.state_name,
      population: each.population,
    }))
  );
});

app.get("/states/:statesId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
  SELECT
    *
  FROM
    state
WHERE 
state_id='${stateId}';`;

  const stateData = await db.all(getStateQuery);
  response.send(
    stateData.map((each) => ({
      stateId: each.state_id,
      stateName: each.state_name,
      population: population,
    }))
  );
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, curved, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO 
    district (district_name,state_id,cases,curved,active,deaths)
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${curved},
        ${active},
        ${deaths}
        
    )`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:district/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
  SELECT
    *
  FROM
    district
    WHERE 
    state_id='${districtId}';`;

    const districtData = await db.all(getDistrictQuery);
    response.send(
      districtData.map((each) => ({
        districtId: each.district_id,
        districtName: each.district_name,
        stateId: each.state_id,
        cases: each.cases,
        curved: each.curved,
        active: each.active,
        deaths: each.deaths,
      }))
    );
  }
);

app.delete(
  "/districts/districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const deleteDistrictQuery = `
    DELETE FROM 
    district
    WHERE 
    district_id='${districtId}';
    `;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      curved,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
    UPDATE district
    SET
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    curved=${curved},
    active=${active},
    deaths=${deaths}
    WHERE 
    district_id=${districtId};`;

    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const stateStatsQuery = `
    SELECT
    Sum(total_cases) as totalCases,
    SUM(curved) as curved,
    SUM(active) as active,
    SUM(deaths) as deaths
    FROM
    state INNER JOIN district 
    WHERE 
    state_id='${stateId}';`;
    const statsResponse = await db.get(stateStatsQuery);
    response.send(
      statsResponse.map((each) => ({
        totalCases: each.totalCases,
        totalCurved: each.curved,
        totalAcitve: each.active,
        totalDeaths: each.deaths,
      }))
    );
  }
);

module.exports = app;
