
import * as SIP from "./sip/index";
export { SIP };

import * as CORE from "./core/index";
export { CORE };

// tslint:disable-next-line:no-var-requires
const pkg = require("../package.json");
const name = pkg.title;
const version = pkg.version;

export {
    name,
    version
};
