const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk'); 
const s3 = new AWS.S3();

// Set in `environment` of serverless.yml
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_PUBLIC_KEY = process.env.AUTH0_CLIENT_PUBLIC_KEY;
const UPLOAD_BUCKET = process.env.BUCKET;

// Policy helper function
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};

// Reusable Authorizer function, set on `authorizer` field in serverless.yml
module.exports.auth = (event, context, callback) => {
  console.log('event', event);
  if (!event.authorizationToken) {
    return callback('Unauthorized');
  }

  const tokenParts = event.authorizationToken.split(' ');
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
    // no auth token!
    return callback('Unauthorized');
  }
  const options = {
    aud: AUTH0_CLIENT_ID,
  };

  try {
    jwt.verify(tokenValue, AUTH0_CLIENT_PUBLIC_KEY, options, (verifyError, decoded) => {
      if (verifyError) {
        console.log('verifyError', verifyError);
        // 401 Unauthorized
        console.log(`Token invalid. ${verifyError}`);
        return callback('Unauthorized');
      }
      // is custom authorizer function
      console.log('valid from customAuthorizer', decoded);
      return callback(null, generatePolicy(decoded.sub, 'Allow', event.methodArn));
    });
  } catch (err) {
    console.log('catch error. Invalid token', err);
    return callback('Unauthorized');
  }
};

// Public API
module.exports.publicEndpoint = (event, context, callback) => {
  console.log('PUBLIC HERE', event, context)
  callback(null, {
    statusCode: 200,
    headers: {
        /* Required for CORS support to work */
      'Access-Control-Allow-Origin': '*',
        /* Required for cookies, authorization headers with HTTPS */
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      message: 'Hi ⊂◉‿◉つ from Public API',
    }),
  });
}

// Private API
module.exports.privateEndpoint = (event, context, callback) => {
  console.log('PRIVATE HERE', event, context)
  const dateString = new Date().toISOString()

  s3.putObject(
    {
      Bucket: 'upload-tool-bucket-dev',
      Key: `uploaded_${dateString}.csv`,
      Body: event.body.data,
      ContentType: "application/octet-stream"
    },
    function (err,data) {
      console.log(JSON.stringify(err) + " " + JSON.stringify(data));
      callback(null, {
        statusCode: 200,
        headers: {
            /* Required for CORS support to work */
          'Access-Control-Allow-Origin': '*',
            /* Required for cookies, authorization headers with HTTPS */
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: err ? JSON.stringify(err) : 'Uploaded!'
          // message: 'success!'
        }),
      });
    }
  );
}
