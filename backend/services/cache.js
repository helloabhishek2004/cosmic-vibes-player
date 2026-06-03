import NodeCache from "node-cache";

// 5 minutes default TTL, check period 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export default cache;
