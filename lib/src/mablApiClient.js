"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MablApiClient = void 0;
const async_retry_1 = __importDefault(require("async-retry"));
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./constants");
const GET_REQUEST_TIMEOUT_MILLIS = 600000;
const POST_REQUEST_TIMEOUT_MILLIS = 900000;
class MablApiClient {
    constructor(apiKey) {
        var _a;
        this.baseUrl = (_a = process.env.MABL_REST_API_URL) !== null && _a !== void 0 ? _a : 'https://api.mabl.com';
        const config = {
            headers: {
                'User-Agent': constants_1.USER_AGENT,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            auth: {
                username: 'key',
                password: apiKey,
            },
        };
        this.httpClient = axios_1.default.create(config);
    }
    static throwHumanizedError(response) {
        switch (response.status) {
            case 401:
                throw new Error(`Unauthorized API error, are you sure you passed the correct API key? Is the key "enabled"?`);
            case 403:
                throw new Error(`Forbidden API error, are you sure you used a "CI/CD Integration" type API key? Ensure this key is for the same workspace you're testing.`);
            case 404:
                throw new Error(`Not Found API error, please ensure any environment or application IDs in your Action config are correct.`);
            default:
                throw new Error(`[${response.status} - ${response.statusText}]`);
        }
    }
    makeGetRequest(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, async_retry_1.default)(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const response = yield this.httpClient.get(url, {
                    timeout: GET_REQUEST_TIMEOUT_MILLIS,
                });
                if (((_a = response.status) !== null && _a !== void 0 ? _a : 400) >= 400) {
                    MablApiClient.throwHumanizedError(response);
                }
                return response.data;
            }), {
                retries: 3,
            });
        });
    }
    makePostRequest(url, requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, async_retry_1.default)(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const response = yield this.httpClient.post(url, JSON.stringify(requestBody), { timeout: POST_REQUEST_TIMEOUT_MILLIS });
                if (((_a = response.status) !== null && _a !== void 0 ? _a : 400) >= 400) {
                    throw new Error(`[${response.status} - ${response.statusText}]`);
                }
                return response.data;
            }), {
                retries: 3,
            });
        });
    }
    getApplication(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.makeGetRequest(`${this.baseUrl}/applications/${id}`);
            }
            catch (error) {
                throw new Error(`failed to get mabl application (${id}) from the API ${error}`);
            }
        });
    }
    getEnvironment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.makeGetRequest(`${this.baseUrl}/environments/${id}`);
            }
            catch (error) {
                throw new Error(`failed to get mabl environment (${id}) from the API ${error}`);
            }
        });
    }
    getExecutionResults(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.makeGetRequest(`${this.baseUrl}/execution/result/event/${eventId}`);
            }
            catch (error) {
                throw new Error(`failed to get mabl execution results for event ${eventId} from the API ${error}`);
            }
        });
    }
    postDeploymentEvent(browserTypes, planLabels, httpHeaders, rebaselineImages, setStaticBaseline, eventTime, properties, applicationId, environmentId, uri, revision, mablBranch) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestBody = this.buildRequestBody(browserTypes, planLabels, httpHeaders, rebaselineImages, setStaticBaseline, eventTime, properties, applicationId, environmentId, uri, revision, mablBranch);
                return yield this.makePostRequest(`${this.baseUrl}/events/deployment/`, requestBody);
            }
            catch (e) {
                throw new Error(`failed to create deployment through mabl API ${e}`);
            }
        });
    }
    buildRequestBody(browserTypes, planLabels, httpHeaders, rebaselineImages, setStaticBaseline, eventTime, properties, applicationId, environmentId, uri, revision, mablBranch) {
        const requestBody = {};
        if (environmentId) {
            requestBody.environment_id = environmentId;
        }
        if (applicationId) {
            requestBody.application_id = applicationId;
        }
        if (mablBranch) {
            requestBody.source_control_tag = mablBranch;
        }
        const planOverrides = {};
        if (browserTypes.length) {
            planOverrides.browser_types = browserTypes;
        }
        if (uri) {
            planOverrides.uri = uri;
        }
        if (httpHeaders.length) {
            planOverrides.http_headers = httpHeaders.map((header) => {
                const parts = header.split(':', 2);
                return {
                    name: parts[0],
                    value: parts[1],
                    log_header_value: false,
                };
            });
            planOverrides.http_headers_required = true;
        }
        requestBody.plan_overrides = planOverrides;
        if (planLabels.length) {
            requestBody.plan_labels = planLabels;
        }
        if (revision) {
            requestBody.revision = revision;
        }
        if (eventTime) {
            requestBody.event_time = eventTime;
        }
        if (properties) {
            requestBody.properties = properties;
        }
        const actions = {};
        if (rebaselineImages) {
            actions.rebaseline_images = rebaselineImages;
        }
        if (setStaticBaseline) {
            actions.set_static_baseline = setStaticBaseline;
        }
        requestBody.actions = actions;
        return requestBody;
    }
}
exports.MablApiClient = MablApiClient;