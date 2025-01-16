module.exports["config"] = { 
  name: "birthday", 
  version: "1.0", 
  role: 0, 
  info: "Calculate age and next birthday", 
  usage: "MM/DD/YYYY", 
  aliases: [], 
  credits: "Developer", 
  cd: 0
}; 

module.exports["run"] = async function({ api, args, event }) {
    const userBirthday = args[0];

    if (!userBirthday) {
        return api.sendMessage("Please provide your birthday in the format MM/DD/YYYY.", event.threadID);
    }

    const name = await chat.userName(event.senderID);

    const birthdayDate = new Date(userBirthday);
    const today = new Date();

    const ageDiff = today.getTime() - birthdayDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    let nextBirthday = new Date(today.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());

    if (today.getTime() > nextBirthday.getTime()) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }

    let timeDiff = nextBirthday.getTime() - today.getTime();
    let milliseconds = timeDiff % 1000;
    timeDiff = (timeDiff - milliseconds) / 1000;
    let seconds = timeDiff % 60;
    timeDiff = (timeDiff - seconds) / 60;
    let minutes = timeDiff % 60;
    timeDiff = (timeDiff - minutes) / 60;
    let hours = timeDiff % 24;
    let days = (timeDiff - hours) / 24;
    let months = nextBirthday.getMonth() - today.getMonth();

    const response = `Name: ${name}\nCurrent Age: ${age}\nBirthdate: ${birthdayDate.toDateString()}\nBirthday Countdown:\n➛ ${months} months\n➛ ${days} days\n➛ ${hours} hours\n➛ ${minutes} minutes\n➛ ${seconds} seconds\n➛ ${milliseconds} milliseconds`;

    return api.sendMessage(response, event.threadID);
};
