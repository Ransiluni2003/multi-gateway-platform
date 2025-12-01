module.exports = {
  chooseEndpoint: function chooseEndpoint(userContext, events, done) {
    const endpoints = [
      '/api/health',
      '/api/health/services',
      '/api/jobs/health',
      '/api/analytics/fraud-trend'
    ];
    const weights = [4, 2, 2, 1];
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = Math.floor(Math.random() * total);
    let idx = 0;
    while (r >= weights[idx]) { r -= weights[idx]; idx++; }
    userContext.vars.endpoint = endpoints[idx];
    return done();
  }
};
