// utility namespace
var util = {

    state:            'loading', // application state
    input:            {},        // bitcoin conversion input
    output:           {},        // bitcoin conversion output
    currencySelect:   {},        // currency selector
    displayPrecision: 3,         // decimal places for display purpose
    mtGoxSocket:      {},        // connection to MtGox API
    messageCounter:   0,         // counter of received messages

    // supported currencies
    currencies: {
        BTC: {},
        USD: {},
        AUD: {},
        CAD: {},
        CHF: {},
        CNY: {},
        DKK: {},
        EUR: {},
        GBP: {},
        HKD: {},
        NZD: {},
        PLN: {},
        RUB: {},
        SGD: {},
        THB: {},
        NOK: {},
        CZK: {},
        JPY: {},
        SEK: {}
    },

    // init
    init: function () {

        // store element references as they will not change
        util.currencySelect = $('#currency-select');
        util.input          = $('#input');
        util.output         = $('#output');

        // detect change of input field
        util.input.bind('input', util.update);

        // detect currency change
        util.currencySelect.change(util.currencyChanged);

        // update information (should simply set everything to N/A)
        util.currencyChanged();

        // MtGox doesn't seem to allow currency changing after establishing
        // socket connection so we are forced to listen to all currency
        // channels all the time...
        var currencyList = '';
        for (var key in util.currencies) {
            if (util.currencies.hasOwnProperty(key)) {
                currencyList += "," + key;
            }
        }
        // get rid of the first ','
        currencyList = currencyList.slice(1);

        // open socket and assign event handlers
        util.mtGoxSocket = MtGox.connect(
            'wss://websocket.mtgox.com/mtgox?Channel=ticker&Currency=' +
                currencyList
        );
        util.mtGoxSocket.on('open',    util.onOpen);
        util.mtGoxSocket.on('message', util.onMessage);
        util.mtGoxSocket.on('error',   util.onError);
        util.mtGoxSocket.on('close',   util.onClose);
    },


    // message handler
    onMessage: function (data) {

        // store last price for calculations
        var messageCurrency = data.ticker.buy.currency;
        util.currencies[messageCurrency].price = Number(data.ticker.last.value);

        // store other relevant data for display purposes
        util.currencies[messageCurrency].last = data.ticker.last.display_short;
        util.currencies[messageCurrency].high = data.ticker.high.display_short;
        util.currencies[messageCurrency].low = data.ticker.low.display_short;
        util.currencies[messageCurrency].volume = data.ticker.vol.display;

        // if this is currently active currency, recalculate total
        if (messageCurrency == util.currencySelect.val()) {
            util.update();
        }

        // update message counter
        $('#message-counter').text(util.messageCounter++);
    },


    // socket open event handler
    onOpen: function () {},


    // error handler
    onError: function () {},


    // socket close handler
    onClose: function () {},


    // perform currency conversion
    update: function () {

        var total, selectedCurrency;

        // selected currency will be required for both conversions
        selectedCurrency = util.currencies[util.currencySelect.val()];

        // first convert bitcoins to selected currency
        total = util.input.val() * selectedCurrency.price;

        // display results of bitcoin conversion
        util.output.text(util.formatNumber(total));

        // update currency info row
        $('.price').text(selectedCurrency.last);
        $('#high').text(selectedCurrency.high);
        $('#low').text(selectedCurrency.low);
        $('#volume').text(selectedCurrency.volume);
    },


    // handle currency change by the user
    currencyChanged: function () {

        var selectedCurrency, price;

        // update selected currency code
        selectedCurrency = util.currencySelect.val();
        $('.currency.selected').text(selectedCurrency);

        // recalculate totals
        util.update();
    },


    // format given number for display
    formatNumber: function (number) {

        if (isNaN(number)) {
            return 'N/A';
        }

        return number.toFixed(util.displayPrecision);
    }
};


// initialise utility functions
$(document).ready(function () {

    util.init();
});
