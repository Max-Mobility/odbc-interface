module.exports = {
    // put all of your helpers inside this object
    list: function(ctx, opts){
        var res = ''
        var keys = Object.keys(ctx);
        keys.map((k) => {
            res += `<li>${k}: ${ctx[k]}</li>`;
        });
        return res;
    }
};
