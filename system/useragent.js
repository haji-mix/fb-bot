// userAgentGenerator.js

const browsers = [{
        name: 'Mozilla/5.0',
        version: [
            'Windows NT 10.0',
            'Macintosh; Intel Mac OS X 10_15_7',
            'Linux; Android',
            'iPhone; CPU iPhone OS'
        ]
    },
    {
        name: 'Chrome',
        version: ['91.0.4472.124',
            '92.0.4515.159',
            '93.0.4577.82'
        ]
    },
    {
        name: 'Safari',
        version: ['537.36']
    },
    {
        name: 'Edge',
        version: ['91.0.864.59']
    },
    {
        name: 'Firefox',
        version: ['89.0',
            '92.0'
        ]
    }
];

const mobileDevices = [{
            device: 'iPhone 12',
            os: 'iPhone; CPU iPhone OS',
            versions: ['14_4',
                '15_0',
                '16_0',
                '13_3'
            ]
        },
        {
            device: 'iPhone 13',
            os: 'iPhone; CPU iPhone OS',
            versions: ['14_4',
                '15_0',
                '16_0'
            ]
        },
        {
            device: 'Samsung Galaxy S20',
            os: 'Linux; Android',
            versions: ['10',
                '11',
                '12',
                '13'
            ]
        },
        {
            device: 'Samsung Galaxy S21',
            os: 'Linux; Android',
            versions: ['10',
                '11',
                '12'
            ]
        },
        {
            device: 'Google Pixel 5',
            os: 'Linux; Android',
            versions: ['10',
                '11',
                '12'
            ]
        },
        {
            device: 'Google Pixel 6',
            os: 'Linux; Android',
            versions: ['11',
                '12'
            ]
        },
        {
            device: 'iPhone SE',
            os: 'iPhone; CPU iPhone OS',
            versions: ['13_3',
                '14_4',
                '15_0'
            ]
        },
        {
            device: 'iPad Pro',
            os: 'iPad; CPU OS',
            versions: ['14_4',
                '15_0',
                '16_0'
            ]
        },
        {
            device: 'Infinix Note 10',
            os: 'Linux; Android',
            versions: ['10',
                '11'
            ]
        },
        {
            device: 'Infinix Zero 8',
            os: 'Linux; Android',
            versions: ['10',
                '11'
            ]
        },
        {
            device: 'Xiaomi Mi 11',
            os: 'Linux; Android',
            versions: ['10',
                '11',
                '12'
            ]
        },
        {
            device: 'Xiaomi Redmi Note 10',
            os: 'Linux; Android',
            versions: ['10',
                '11',
                '12'
            ]
        },
        {
            device: 'Tecno Camon 16',
            os: 'Linux; Android',
            versions: ['10',
                '11'
            ]
        },
        {
            device: 'Tecno Spark 6',
            os: 'Linux; Android',
            versions: ['10',
                '11'
            ]
        },
        {
            device: 'Redmagic 6',
            os: 'Linux; Android',
            versions: ['11',
                '12'
            ]
        },
        {
            device: 'Redmagic 5G',
            os: 'Linux; Android',
            versions: ['10',
                '11'
            ]
        },
        {
            device: 'Redmagic 7',
            os: 'Linux; Android',
            versions: ['11',
                '12'
            ]
        }
    ];

const desktopPlatforms = [
    'Windows NT 10.0',
    'Macintosh; Intel Mac OS X 10_15_7',
    'X11; Linux x86_64'
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUserAgent() {
    const isMobile = Math.random() < 0.7; // 70% chance for mobile devices
    let os;
    let device;

    if (isMobile) {
        const selectedDevice = getRandomElement(mobileDevices);
        const version = getRandomElement(selectedDevice.versions);
        os = `${selectedDevice.os} ${selectedDevice.device} OS ${version} like Mac OS X`;
    } else {
        os = getRandomElement(desktopPlatforms);
    }

    const browser = getRandomElement(browsers);
    const browserVersion = getRandomElement(browser.version);

    return `${browser.name} (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`;
}

module.exports = {
    generateUserAgent,
    browsers,
    mobileDevices,
    desktopPlatforms
};
