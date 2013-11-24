// utility namespace
var util = {

    state:            'loading', // application state
    bitcoinInput:     {},        // bitcoin conversion input
    bitcoinOutput:    {},        // bitcoin conversion output
    currencyInput:    {},        // currency conversion input
    currencyOutput:   {},        // currency conversion output
    currencySelect:   {},        // currency selector
    displayPrecision: 3,         // decimal places for display purpose
    fadeInSpeed:      500,       // fadeIn effect speed
    mtGoxSocket:      {},        // connection to MtGox API

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

        // set initial application state
        util.setState('connecting');

        // store element references as they will not change
        util.currencySelect = $('#currency-select');
        util.bitcoinInput   = $('#btc-input');
        util.bitcoinOutput  = $('#btc-output');
        util.currencyInput  = $('#ccy-input');
        util.currencyOutput = $('#ccy-output');

        // detect change of any input field
        util.bitcoinInput.bind('input', util.update);
        util.currencyInput.bind('input', util.update);

        // detect currency change
        util.currencySelect.change(util.currencyChanged);

        // since css less allows drop down state not to change after page
        // reload we have to trigger currency change event manually
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

        var messageCurrency, previousExchangeRate, newExchangeRate,
            exchangeRateSpan;

        // store latest exchange rate (use average for now)
        messageCurrency = data.ticker.buy.currency;
        previousExchangeRate = util.currencies[messageCurrency].exchangeRate;
        newExchangeRate = Number(data.ticker.avg.value);
        util.currencies[messageCurrency].exchangeRate = newExchangeRate;

        // if this is currently active currency, update conversion
        if (messageCurrency == util.currencySelect.val()) {

            // recalculate totals
            util.update();

            // update displayed exchange rate and highlight if it has changed
            exchangeRateSpan = $('#exchange-rate');
            exchangeRateSpan.text(util.formatNumber(newExchangeRate));
            if (newExchangeRate > previousExchangeRate) {
                exchangeRateSpan.addClass('increase');
            } else if (newExchangeRate < previousExchangeRate) {
                exchangeRateSpan.addClass('decrease');
            } else if (newExchangeRate == previousExchangeRate) {
                util.clearExchangeRateHighlights();
            }

            // if this is the first message of desired currency, enable UI
            if (util.state != 'ready') {
                util.setState('ready');
            }
        }
    },


    // socket open event handler
    onOpen: function () {

        util.setState('connected');
    },


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
        total = util.bitcoinInput.val() * selectedCurrency.exchangeRate;

        // display results of bitcoin conversion
        util.bitcoinOutput.val(util.formatNumber(total));

        // now convert selected currency to bitcoins
        total = util.currencyInput.val() / selectedCurrency.exchangeRate;

        // display results of selected currency conversion
        util.currencyOutput.val(util.formatNumber(total));
    },


    // handle currency change by the user
    currencyChanged: function () {

        var selectedCurrency, exchangeRate;

        // update currency codes
        selectedCurrency = util.currencySelect.val();
        $('.ccy.selected').text(selectedCurrency);

        // update displayed exchange rate if required and clear any highlights
        exchangeRate = util.formatNumber(
            util.currencies[selectedCurrency].exchangeRate
        );
        if (isNaN(exchangeRate)) {
            util.setState('loading');
        } else if (util.state == 'loading') {
            util.setState('ready');
        }
        $('#exchange-rate').text(exchangeRate);
        util.clearExchangeRateHighlights();

        // recalculate totals
        util.update();
    },


    // update status bar
    setState: function (state) {

        var text = '';
        var previousState = util.state;

        switch (state) {
            case 'connecting':
                text = 'Connecting to MtGox API...';
                break;
            case 'connected':
                text = 'Connection established, waiting for data...';
                break;
            case 'loading':
                text = 'No data for this currency received. Waiting...'
                $('#status').removeClass('ok');
                break;
            case 'ready':
                text = 'Application initialised. Exchange rate and converted\
                    totals are updated in real time.';
                $('#status').addClass('ok');
                util.displayUI();
                break;
        }
        util.state = state;

        // update info text
        $('#status-text').text(text);
    },


    // display UI elements
    displayUI: function () {

        $('#controls').fadeIn(util.fadeInSpeed);
    },


    // clear highlights from exchange rate span
    clearExchangeRateHighlights: function () {

        $('#exchange-rate').removeClass('increase decrease');
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
