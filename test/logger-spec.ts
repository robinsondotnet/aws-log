// tslint:disable:no-implicit-dependencies
import * as chai from "chai";
import * as helpers from "./testing/helpers";
import { getLoggerConfig, logger, LogLevel } from "../src/logger";
import { IDictionary, IAWSLambaContext } from "common-types";

const expect = chai.expect;
process.env.LOG_LEVEL="";

const lambdaEvent: IDictionary = {
  foo: 1,
  bar: 2,
  headers: {
    "@x-correlation-id": "1234"
  }
};
const lambdaContext: IAWSLambaContext = {
  functionName: "foobar",
  functionVersion: "1.0",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:845955389040:function:abc-prod-fn",
  memoryLimitInMB: "512",
  awsRequestId: "rid1234",
  logGroupName: "log-group",
  logStreamName: "log-stream"
}

describe("Logger Basics", () => {
  it("logger() provides expected API", () => {
    const api = logger();
    // Logging functions
    testLoggingApi(api);
    // context setting
    expect(api).to.have.property('context');
    expect(api).to.have.property('lambda');
  });
  it("Initialization without context() works as expected", () => {
    const api = logger();
    const config = getLoggerConfig();
    expect(config.correlationId).is.not.equal(undefined);
    expect(config.severity).is.equal(LogLevel.info);
  });
  it("Initialization with context() works as expected", () => {
    const api = logger().context({ foo: 1, bar: 2 });
    testLoggingApi(api);
    missingContextApi(api);
    const config = getLoggerConfig();
    expect(config.correlationId).is.not.equal(undefined);
    console.log(process.env.LOG_LEVEL);

    expect(config.severity).is.equal(LogLevel.info);
    expect(config.context).to.be.an('object');
    expect(config.context.foo).to.equal(1);
    expect(config.context.bar).to.equal(2);
  });

  it("Severity responds to LOG_LEVEL environment variable", () => {
    process.env.LOG_LEVEL = String(LogLevel.warn);
    const api = logger();
    const config = getLoggerConfig();
    expect(config.correlationId).is.not.equal(undefined);
    expect(config.severity).is.equal(LogLevel.warn);

    process.env.LOG_LEVEL = String(LogLevel.error);
  });

  it("Initialization with lambda() works as expected", () => {
    const api = logger().lambda(lambdaEvent, lambdaContext);
    testLoggingApi(api);
    missingContextApi(api);
    const config = getLoggerConfig();
    expect(config.context).to.be.an('object');
    expect(config.context.functionName).to.equal(lambdaContext.functionName);
    expect(config.context.logStreamName).to.equal(lambdaContext.logStreamName);
    expect(config.correlationId).is.equal(lambdaEvent.headers["@x-correlation-id"]);
  });

  it("Initialization with lambda(), using additional context works as expected", () => {
    const api = logger().lambda(lambdaEvent, lambdaContext, { foo: 1, bar: 2, context: "not-conflict" });
    const config = getLoggerConfig();
    expect(config.context).to.be.an('object');
    expect(config.context.functionName).to.equal(lambdaContext.functionName);
    expect(config.context.logStreamName).to.equal(lambdaContext.logStreamName);
    expect(config.context.foo).to.equal(1);
    expect(config.context.bar).to.equal(2);
    expect(config.context.context).to.equal("not-conflict");
    expect(config.correlationId).is.equal(lambdaEvent.headers["@x-correlation-id"]);
  });

  it('conflict with "context" property resolved', () => {
    const api = logger().lambda({...lambdaEvent, ...{context: "conflict"}}, lambdaContext, { foo: 1, bar: 2, context: "not-conflict" });
    process.env.LOG_TESTING="true";
    const response = api.log("this is a test", {
      foo: 1,
      bar: 2,
      context: "conflict"
    });
    process.env.LOG_TESTING="";

    expect(response._context).to.equal("conflict");
    expect(response.context).to.be.an("object");
  });

});

function testLoggingApi(api: any) {
  expect(api).to.have.property('debug');
  expect(api).to.have.property('log');
  expect(api).to.have.property('info');
  expect(api).to.have.property('warn');
  expect(api).to.have.property('error');
}

function missingContextApi(api: any) {
  expect(api).to.not.have.property("context");
  expect(api).to.not.have.property("lambda");
}
