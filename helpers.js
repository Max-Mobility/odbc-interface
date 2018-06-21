module.exports = {
    // put all of your helpers inside this object
    list: function(ctx, opts){
        var res = ''
        var keys = Object.keys(ctx);
        res += `<summary>${keys[0]}: ${ctx[keys[0]]}</summary>`;
        res += '<ul>'
        keys.map((k) => {
            res += `<li>${k}: ${ctx[k]}</li>`;
        });
        res += '</ul>'
        return res;
    }
};
