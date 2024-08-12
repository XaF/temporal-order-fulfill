#!/usr/bin/env bash

echo -e '\033[1;31mWelcome to the Temporal sandbox!\033[0m'
echo
echo -e 'The Temporal sandbox is a pre-configured environment that starts a Temporal server, a Web UI, and a Worker. The worker gets automatically restarted when you make changes to the code.'
echo
echo -e 'A few demos are provided for you to see what Temporal can offer. You can launch them by using the terminal and calling:'
echo -e '- \033[1;32mnpm run demo.0\033[0m for a demo that launches workflows while simulating a failing API (inventory service); this will show you how Temporal can handle failures and retries, and how all of your workflows will automatically continue their process as soon as the API is available again.'
echo -e '- \033[1;32mnpm run demo.1\033[0m for a demo that launches workflows while some of the input data is invalid; this will show you how Temporal can handle bug fixing "on the fly", as changing the code path in the activities that receive invalid that will all of a sudden allow for all activities to reconvene.'
echo
echo -e 'You can also run a workflow by calling \033[1;32mnpm run workflow -- [options]\033[0m.'
echo -e 'Available options are:'
echo -e '- \033[1;32m--numOrders\033[0m to specify the number of orders to create (default is 1)'
echo -e '- \033[1;32m--invalidPercentage\033[0m to specify the percentage of invalid orders to create (default is 0)'
echo -e '- \033[1;32m--expensivePercentage\033[0m to specify the percentage of expensive (>10000$) orders to create (default is 0)'
echo -e '- \033[1;32m--expiredCardPercentage\033[0m to specify the percentage of orders with expired credit cards to create (default is 0)'
echo
echo -e 'Enjoy your Temporal sandbox!'
echo -e '[Press "q" to access the terminal]'
