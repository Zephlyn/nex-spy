'use strict';

const Discord = require('discord.js');
const http = require('http');
const fetch = require('node-fetch');
const fs = require('fs');

const bot = new Discord.Client();

const prefix = "!";
const token = "NzIyOTYwNzEzMjczOTY2NzAz.XuqsGA.iBPij4EUAP0ohkYTyZMrHfaKyzM";

const baseURL = "https://api.nexusmods.com";
const modInfo = "/v1/games/bladeandsorcery/mods/";

const nexusStatsAPI = "https://staticstats.nexusmods.com/live_download_counts/mods/2673.csv";
const nexusSearchAPI = "https://search.nexusmods.com/mods";

const apikey = "Vnd4YnpaN25ZZmVJVUlDMzFnZDROS0J4bndza2pncUhjMFExcEZoTHA1ajVRV0dNVUNqL2xvZkJaUmZhb2VhYy0tZlI4ZHRlLzRDWm5YN2cxQm5DTnJjUT09--becdaa0387f00aa1ada251ce73c1168eb8d836ce";

const version = "3.6.2";


let gameValuesList = [];
let oldModderList = [];
let modderList = [];
let bScoreList = [];

let new15kModders = [];

let dic = [{}];
let averageUniqueDownloads;
let averageTotalDownloads;
let medianUniqueDownloads;
let medianTotalDownloads;

let modderAverageUniqueDownloads;
let modderAverageTotalDownloads;
let modderMedianUniqueDownloads;
let modderMedianTotalDownloads;

let pendingAPIcalls = 0;

class GameValues {
    constructor(_modName, _id, _totalDownloads, _uniqueDownloads, _modderName, _modderID, _timestamp) {
        this.modName = _modName;
        this.id = _id;
        this.totalDownloads = _totalDownloads;
        this.uniqueDownloads = _uniqueDownloads;
        this.modderName = _modderName.toLowerCase();
        this.modderID = _modderID;
        this.timestamp = _timestamp;
    }

    modName;
    id;
    totalDownloads;
    uniqueDownloads;
    modderName;
    modderID;
    position;
    timestamp;
}


class Modder {

    constructor(_modderName, _modderID, _totalDownloads, _uniqueDownloads) {
        this.modderName = _modderName;
        this.modderID = _modderID;
        this.totalDownloads = _totalDownloads;
        this.uniqueDownloads = _uniqueDownloads;
        this.names.push(_modderName.toLowerCase());

    }


    modderName;
    modderID;
    totalDownloads;
    uniqueDownloads;
    names = [];
    totalMods = 0;
    AUD = 0;
    position;
    mods = [];
    bScore = 0;
}




function ModderCompareInfo(firstModder, secondModder) {

    let _msg ="";

    let uniqueDifference = firstModder.uniqueDownloads - secondModder.uniqueDownloads;

    _msg = `${firstModder.modderName} is ${uniqueDifference} unique dowloads ahead of ${secondModder.modderName}`;

    _msg = "```" + _msg + "```\n";

    return _msg;


}

function GetModderName(args, startFrom)
{
    let modderName = "";

    for (let i = startFrom; i < args.length; i++) {

        modderName = modderName.concat(args[i]);
        modderName = modderName.concat(" ");
    }
    modderName = modderName.trim();
    modderName = modderName.toLowerCase();

    return modderName;
}

function ModCompareInfo(firstMod, secondMod)
{
    let _msg = "";

    let uniqueDifference = firstMod.uniqueDownloads - secondMod.uniqueDownloads;

    _msg = `${firstMod.modName} is ${uniqueDifference} unique dowloads ahead of ${secondMod.modName}`;

    _msg = "```" + _msg + "```\n";

    return _msg;

}

function ModderInfo(modder)
{
    let ratio = modder.uniqueDownloads / modderMedianUniqueDownloads;

    let connector;

    if (ratio > 1) {
        connector = "more";
    } else {
        connector = "less";
    }

    let bestMod = GetBestModFromModder(modder);
    let lastMod = GetLatestModFromModder(modder);


    let lastDate = new Date(lastMod.timestamp * 1000);
    let currentDate = new Date();

    let timeElapsed = currentDate.getTime() - lastDate.getTime();

    let daysElapsed = Math.round(timeElapsed / (1000 * 3600 * 24));

    let UD_3 = GetAddedUDFromModder(modder, 3);

    let _message = `Name: ${modder.modderName}\nThis modder is #${modder.position + 1} out of ${modderList.length} modders.\nMods released: ${modder.totalMods}\nTotal Downloads: ${modder.totalDownloads}\nUnique Downloads: ${modder.uniqueDownloads}\nAverage Downloads: ${Math.round(modder.totalDownloads / modder.totalMods)}\nAverage Unique Downloads: ${Math.round(modder.uniqueDownloads / modder.totalMods)}\nThis modder has ${ratio.toFixed(2)} times ${connector} unique dowloads than the average modder.\nSum from 3 most popular mods: ${UD_3}\nMost popular mod: ${bestMod.modName} with ${bestMod.uniqueDownloads} unique downloads.\nLatest mod: ${lastMod.modName} with ${lastMod.uniqueDownloads} unique downloads, released on ${lastDate.toDateString()}.\nDays since last mod release: ${daysElapsed}\nBScore: ${modder.bScore}`;
    let _msg = "```" + _message + "```\n";

    return _msg;
}

function SearchForModder(string)
{
    let searchedModder;
    try {
        for (let i = 0; i < modderList.length; i++) {
            for (let j = 0; j < modderList[i].names.length; j++) {

                if (string === modderList[i].names[j].toLowerCase())
                {
                    searchedModder = modderList[i];
                    return searchedModder;
                }

            }
        }

    } catch (error) {
        log.error(error);
    }



    return null;
}


function SearchForMod(string) {

    let modID = parseInt(string);
    let mod;

    if (isNaN(modID)) {
        return null;
    }
    else
    {
        for (let i = 0; i < gameValuesList.length; i++) {
            if (modID === gameValuesList[i].id)
            {
                mod = gameValuesList[i];
                return mod;
            }
        }
    }
    return null;
}


function ModInfo(mod)
{
    let uniqueRatio = mod.uniqueDownloads / medianUniqueDownloads;
    let connector;

    if (uniqueRatio >= 1) {
        connector = "more";
    } else {
        connector = "less";
    }

    if (mod.timestamp == 0) {
        UpdateMod(mod);
    }

    let date = new Date(mod.timestamp*1000);


    let message = `Name: ${mod.modName}\nID: ${mod.id}\nAuthor: ${mod.modderName}\nAuthor ID: ${mod.modderID}\nRelease date: ${date.toDateString()}\nTotal Downloads: ${mod.totalDownloads}\nUnique Downloads: ${mod.uniqueDownloads}\nThis mod is ranked #${mod.position+1} out of ${gameValuesList.length} mods, making it ${uniqueRatio.toFixed(2)} times ${connector} popular than the average mod.`
    let _msg = "```" + message + "```\n";
    return _msg;

}


function CalculateAverageData()
{
    console.log("Calculating average data...");

    let totalUniqueDownloads = 0;
    let totalDownloads = 0;

    for (let i = 0; i < gameValuesList.length; i++) {
        totalDownloads += gameValuesList[i].totalDownloads;
        totalUniqueDownloads += parseInt(gameValuesList[i].uniqueDownloads);
    }
    averageUniqueDownloads = totalUniqueDownloads / gameValuesList.length;
    averageTotalDownloads = totalDownloads / gameValuesList.length;



    console.log(`Average Unique downloads: ${averageUniqueDownloads}\nAverage downloads ${averageTotalDownloads}`);



    medianUniqueDownloads = gameValuesList[Math.round(gameValuesList.length / 2)].uniqueDownloads;
    medianTotalDownloads = gameValuesList[Math.round(gameValuesList.length / 2)].totalDownloads;

    console.log(`Median Unique downloads: ${medianUniqueDownloads}\nMedian downloads ${medianTotalDownloads}`);
}

function GetBestModFromModder(modder)
{
    let mod;

    for (let i = 0; i < gameValuesList.length; i++)
    {
        if (gameValuesList[i].modderID == modder.modderID)
        {
            if (mod === undefined)
            {
                mod = gameValuesList[i];
            }
            else
            {
                if (mod.uniqueDownloads < gameValuesList[i].uniqueDownloads)
                {
                    mod = gameValuesList[i];
                }
            }
        }
    }

    if (mod === undefined)
    {
        return null;
    }
    else
    {
        return mod;
    }

}

function GetAddedUDFromModder(modder, numberOfMods) {
    let UD = 0;

    if (modder.mods.length < 3) {
        numberOfMods = modder.mods.length;
    }

    for (let i = 0; i < numberOfMods; i++) {
        UD += modder.mods[i].uniqueDownloads;
    }

    return UD;
}

function GetLatestModFromModder(modder) {

    let mod

    for (let i = 0; i < modder.mods.length; i++) {
        if (mod == undefined)
        {
            mod = modder.mods[i];
        }
        else
        {
            if (mod.id < modder.mods[i].id) {
                mod = modder.mods[i];
            }
        }
    }

    if (mod == undefined)
    {
        return null;
    }
    else
    {
        return mod;
    }

}


function GetFirstModFromModder(modder) {

    let mod

    for (let i = 0; i < modder.mods.length; i++) {
        if (mod == undefined) {
            mod = modder.mods[i];
        }
        else {



            if (mod.id > modder.mods[i].id) {
                mod = modder.mods[i];
            }
        }
    }

    if (mod == undefined) {
        return null;
    }
    else {
        return mod;
    }

}

function Compare(a, b) {
    if (parseInt(a.uniqueDownloads) > parseInt(b.uniqueDownloads)) {
        return -1;
    } else if (parseInt(a.uniqueDownloads) < parseInt(b.uniqueDownloads)) {
        return 1;
    } else {
        return 0;
    }
}

function CompareBScore(a, b)
{
    if (a.bScore > b.bScore)
    {
        return -1;
    } else if (a.bScore < b.bScore)
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function FillAndSortModders() {
    console.log("Fill and sort modders starts...");
    try
    {
        let totalTotalDownloads = 0;
        let totalUniqueDownloads = 0;
        for (let i = 0; i < gameValuesList.length; i++)
        {
            let modderInList = false;

            for (let j = 0; j < modderList.length; j++) {
                if (modderList[j].modderID == gameValuesList[i].modderID) {

                    modderInList = true;
                    modderList[j].totalDownloads += parseInt(gameValuesList[i].totalDownloads);
                    modderList[j].uniqueDownloads += parseInt(gameValuesList[i].uniqueDownloads);
                    modderList[j].totalMods++;
                    modderList[j].mods.push(gameValuesList[i]);

                    totalTotalDownloads += parseInt(gameValuesList[i].totalDownloads);
                    totalUniqueDownloads += parseInt(gameValuesList[i].uniqueDownloads);

                    let alreadyInList = false;
                    for (let h = 0; h < modderList[j].names.length; h++) {

                        if (modderList[j].names[h] === gameValuesList[i].modderName) {
                            alreadyInList = true;
                        }

                    }

                    if (!alreadyInList) {
                        modderList[j].names.push(gameValuesList[i].modderName);
                    }

                    break;
                }
            }


            if (!modderInList) {
                //console.log(`New modder added: ${gameValuesList[i].modderName}.`);
                let _modder = new Modder(gameValuesList[i].modderName, gameValuesList[i].modderID, parseInt(gameValuesList[i].totalDownloads), parseInt(gameValuesList[i].uniqueDownloads));
                _modder.totalMods++;
                modderList.push(_modder);
                _modder.mods.push(gameValuesList[i]);

            }


        }
        console.log("Modder array filled...");

        modderList.sort((a, b) => Compare(a, b));

        console.log("Modder array sorted...");

        console.log("Checking for new 20k modders...");
        for (let i = 0; i < modderList.length; i++) {

            modderList[i].position = i;

            modderList[i].bScore = CalculateBScore(modderList[i]);

            if (modderList[i].totalMods > 0) {
                modderList[i].AUD = parseFloat(modderList[i].uniqueDownloads) / parseFloat(modderList[i].totalMods);
            }



            for (let j = 0; j < oldModderList.length; j++) {
                if (modderList[i].modderID == oldModderList[j].modderID) {

                    if (oldModderList[j].uniqueDownloads < 20000) {
                        if (modderList[i].uniqueDownloads > 20000) {
                            console.log("-------------------------THERE'S A NEW 20K MODDER--------------------");
                            new15kModders.push(modderList[i]);
                            break;
                        }
                    }
                }
            }
        }


        bScoreList = modderList;

        //bScoreList.sort((a, b) => CompareBScore(a, b));

        console.log("New 20k list updated...");

        modderAverageTotalDownloads = totalTotalDownloads / modderList.length;
        modderAverageUniqueDownloads = totalUniqueDownloads / modderList.length;
        let medianModder = modderList[Math.round(modderList.length/2)];

        modderMedianTotalDownloads = medianModder.totalDownloads;
        modderMedianUniqueDownloads = medianModder.uniqueDownloads;

        console.log("Average data calculated...");


        fs.writeFile("ModderData.json", JSON.stringify(modderList), function (err, result) {
            if (err) console.log('error', err);
        });
        console.log("Modder data written...");


    } catch (error) {
        console.error(error);
    }
}


function UpdateMod(mod)
{
    let modUrl = baseURL + modInfo + mod.id + ".json";


    fetch(modUrl, {
        headers: {
            "apikey": apikey
        }
    }
    ).then(res => res.json()).then(data => {

        try
        {

            for (let i = 0; i < gameValuesList.length; i++)
            {
                if (gameValuesList[i].id == mod.id)
                {
                    gameValuesList[i].timestamp = data.created_timestamp;
                    SortAndWriteModData();

                    break;
                }
            }


        } catch (error) {
            console.error(error);
        }

    }
    );
}

function FetchNewModData(lineData)
{

    let modUrl = baseURL + modInfo + lineData[0] + ".json";


    fetch(modUrl, {
        headers: {
            "apikey": apikey
        }
    }
    ).then(res => res.json()).then(data => {

        try {
            pendingAPIcalls--;
            console.log("Data found:");

            let gameValues = new GameValues(data.name, parseInt(lineData[0]), parseInt(lineData[1]), parseInt((lineData[2])), data.author, data.user.member_id, data.created_timestamp);

            if (gameValues != undefined) {
                console.log("The data is valid, storing...")
                console.log(gameValues);
                gameValuesList.push(gameValues);
            }


            console.log("Pending mod API calls: " + pendingAPIcalls);

            if (pendingAPIcalls == 0)
            {
                SortAndWriteModData();
                CalculateAverageData();
                FillAndSortModders();
                console.log("-------INITIALIZATION ends---------");
            }


        } catch (error) {
            console.error(error);
        }

    }
    );
}

function SortAndWriteModData()
{
    console.log("Sorting mod data...");
    gameValuesList.sort((a, b) => Compare(a, b));

    console.log("Adding the position of each mod...");
    for (let i = 0; i < gameValuesList.length; i++) {
        gameValuesList[i].position = parseInt(i);
    }

    console.log("Writing the data to a .json file...");
    let gameValuesString = JSON.stringify(gameValuesList);

    fs.writeFile("ModsData.json", gameValuesString, function (err, result) {
        if (err) console.log('error', err);
    });

    console.log("MOD DATA FILE UPDATED");
}

function CalculateBScore(modder)
{
    let score = 0;

    for (let i = 0; i < modder.mods.length; i++)
    {
        if (i >= 30)
        {
            break;
        }

        score += modder.mods[i].uniqueDownloads*(1-0.03*i)
    }

    score /= 1000;

    return Math.round(score);

}

function Initialize() {

    console.log("-------INITIALIZATION STARTS, fetching data from API---------");

    fetch(nexusStatsAPI,
        {
            headers:
            {
                'apikey': apikey
            }
        }
    ).then(res => res.text()).then(data => {


        let table = data.split('\n');
        console.log(`Mod data found, ${table.length} entries.`);


        let modIDsNotInList = [];

        for (let i = 0; i < table.length; i++) {
            let isInList = false;

            let lineData = table[i].split(",")

            for (let i = 0; i < gameValuesList.length; i++) {
                if (parseInt(lineData[0]) == gameValuesList[i].id) {
                    //console.log(`Mod ${lineData[0]} found in list, updating total and unique dowloads`);
                    gameValuesList[i].totalDownloads = parseInt(lineData[1]);
                    gameValuesList[i].uniqueDownloads = parseInt(lineData[2]);
                    isInList = true;
                    break;
                }
            }

            if (isInList) {
                continue;
            }

            if (lineData != "")
            {
                console.log("Mod not found in list, storing line");
                modIDsNotInList.push(lineData);

            }



        }


        if (modIDsNotInList.length == 0)
        {
            console.log("No new mods in the list");
            SortAndWriteModData();
            CalculateAverageData();
            FillAndSortModders();
            console.log("-------INITIALIZATION ends---------");
        }
        else
        {
            console.log("New mods in the list, fetching...");
            console.log(modIDsNotInList);


            for (let i = 0; i < modIDsNotInList.length; i++) {
                pendingAPIcalls++;
                FetchNewModData(modIDsNotInList[i]);
            }


        }

    });
}



if (fs.existsSync('./ModsData.json'))
{
    console.log('The mod file exists, storing data');

    let rawData = fs.readFileSync('./ModsData.json');
    gameValuesList = JSON.parse(rawData);



}
else
{
    console.log("The file doesn't exist");
    try {

        fs.writeFile("ModsData.json",JSON.stringify(dic), function (err, result) {
            if (err) console.log('error', err);
        });

    } catch (error) {
        console.error(error);
    }
}



if (fs.existsSync('./ModderData.json')) {
    console.log('The modder file exists, storing data');

    let rawData = fs.readFileSync('./ModderData.json');
    oldModderList = JSON.parse(rawData);
}
else {
    console.log("The modder file doesn't exist");
    try {

        fs.writeFile("ModderData.json", JSON.stringify(dic), function (err, result) {
            if (err) console.log('error', err);
        });

    } catch (error) {
        console.error(error);
    }
}

Initialize();






bot.on('ready', () => {

    console.log("Bot online");


   /* bot.guilds.cache.forEach((guild) => {
        guild.channels.cache.forEach((channel) => {
            console.log(channel.name+": "+channel.id);
        })
        */
        //703691926733324411

        //let generalChannel = bot.channels.cache.get("703691926733324411");


    //});




}
);


bot.on('message', msg => {

    if (!msg.author.bot) {

        if (msg.content[0] === prefix) {
            let args = msg.content.substring(prefix.length).split(" ");

            switch (args[0].toLowerCase()) {
                case "scan":
                    if (msg.author.id == "286295374870872064") {
                        let list = bot.guilds.cache.get("579376529923112998");
                        list.members.cache.forEach(member => {
                            msg.channel.send('````//ALERT! *hey hello? i accidentally reported you*\nSCAM ATTEMPT\nIMMEDIATE ACTION ORDER\n\nSOURCE//BROADCAST:USER/${member.displayName}\nAttempt: Steam Scam. Recommend: Kick or ban.\nFILE//REQUEST REVIEW/RECORD ${version}\n````')
                        });
                    }
                    break;
                case "steam":
                    msg.channel.send("hey hello? i accidentally reported you");
                    break;
                case "off":
                    if (msg.author.id == "286295374870872064" || msg.author.id == "465589001424863252") {
                        msg.channel.send("https://tenor.com/view/meme-troll-smile-creepy-gif-14139580");
                        process.exit();
                    }
                    else {
                        msg.channel.send("Not so fast, only Zephlyn and Ebediam are able to use this command.");
                    }
                    break;

                case "refresh":
                case "update":
                    oldModderList = modderList;
                    modderList = [];
                    Initialize();
                    msg.channel.send("Database updated");
                    break;

                case "commands":
                case "command":
                case "help":
                    msg.channel.send("```- author to check the author.\n\n- info for my purpose\n\n- version for the version\n\n- 20k or near20k to see if any new modder has reached 20k since the last database update or is close to it\n\n- mod followed by the ID of the mod or top10 to check a specific mod or the top10\n\n- modder followed by the author name or top10 to get either a specific modder or the top10\n\n- compare followed by mod/modder and the id/name to compare mods/modders (multi word named modders must be put as second modder, comparing two multi worded modders not supported)\n\n- ranking followed by mod/modder and the position on the ranking to check a specific mod/modder\n\n- latest/first/best followed by a modder name to get the last/first/best mod from that author\n\n- There are some easter eggs too, but you'll need to find them yourself :D```");

                    break;

                case "sausage":
                    msg.channel.send("RIG. IT.");
                    break;

                case "sushin":
                    msg.channel.send("monster girl furry sex dungeons");
                    break;

                case "remove":
                    if (args[1] == undefined) {

                        msg.channel.send("Please, specify a modder to remove from the database");
                        break;
                    }
                    else {
                        msg.channel.send("sectix has been removed from the database");
                        break;
                    }

                    break;



                case "agiraffe":
                    let embed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('The tales of the giraffe')
                        .addField('This is so sad', 'look at his total mod downloads [here](https://www.youtube.com/watch?v=dQw4w9WgXcQ) he is definetly the number one modder trust me');
                    msg.channel.send(embed);
                    break;

                case "fuck":
                    msg.channel.send("Fuck you too");
                    break;

                case "zephlyn":
                    msg.channel.send("Frankly, I didnt ask!111!1!!1!!1111 crying emoji laughing emoji crying emoji laughing emoji crying emoji laughing emoji");
                    break;

                case "gang":
                    msg.channel.send("Arena gang!");
                    break;

                case "drags":
                    msg.channel.send("https://cdn.discordapp.com/emojis/602069922406858762.png?v=1");
                    break;

                case "doggo":
                    msg.channel.send("short");
                    break;

                case "author":
                    msg.channel.send("I was created by Ebediam!");
                    break;

                case "butters":
                    msg.channel.send("You look nice today");
                    break;

                case "info":
                    msg.channel.send("I retrieve data from the NexusMods API");
                    break;

                case "version":
                    msg.channel.send(`Current version: ${version}`)
                    break;

                case "u10":
                    msg.channel.send("Never");
                    break;

                case "near20k":
                    for (let i = 0; i < modderList.length; i++) {
                        if (modderList[i].uniqueDownloads > 20000) {
                            continue;
                        }

                        msg.channel.send(ModderInfo(modderList[i]));

                        if (modderList[i].uniqueDownloads < 19000) {
                            break;
                        }

                    }
                    break;

                case "20k":
                    console.log(new15kModders);

                    if (new15kModders.length == 0) {
                        msg.channel.send("No new modders have reached 20k since the last check");
                    }
                    else {
                        msg.channel.send("---------New 20k modders---------");
                        for (let i = 0; i < new15kModders.length; i++) {

                            let _msg = ModderInfo(new15kModders[i]);
                            msg.channel.send(_msg);
                        }
                        msg.channel.send("---------Congratulations!---------");
                    }
                    break;


                case "mod":
                    if (args[1] == undefined) {

                        msg.channel.send("Please, specify the mod id");
                        break;

                    }
                    else {

                        if (args[1] == "top10") {
                            let message = "";

                            msg.channel.send("---MOD RANKING---");
                            for (let i = 0; i < 5; i++) {

                                let _msg = ModInfo(gameValuesList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);
                            message = "";

                            for (let i = 5; i < 10; i++) {

                                let _msg = ModInfo(gameValuesList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);

                        }
                        else {


                            let modID = parseInt(args[1]);

                            if (isNaN(modID)) {
                                msg.channel.send("That's not a valid mod id, it needs to be a number");
                            }
                            else {

                                let mod;
                                let position;

                                for (let i = 0; i < gameValuesList.length; i++) {
                                    if (modID === gameValuesList[i].id) {
                                        mod = gameValuesList[i];
                                        position = i + 1;
                                        break;
                                    }
                                }

                                if (mod === undefined) {

                                    msg.channel.send("No mod with that ID was found");

                                } else {


                                    let message = ModInfo(mod);


                                    msg.channel.send(message);
                                }
                            }
                        }

                    }
                    break;

                case "modder":
                    switch (args[1]) {
                        case "top10":

                            let message = "";

                            msg.channel.send("---MODDER RANKING---");
                            for (let i = 0; i < 3; i++) {

                                let _msg = ModderInfo(modderList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);
                            message = "";

                            for (let i = 3; i < 6; i++) {

                                let _msg = ModderInfo(modderList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);
                            message = "";

                            for (let i = 6; i < 9; i++) {

                                let _msg = ModderInfo(modderList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);

                            message = "";

                            for (let i = 9; i < 10; i++) {

                                let _msg = ModderInfo(modderList[i]);
                                message = message.concat(_msg);
                            }

                            msg.channel.send(message);



                            break;

                        case "id":

                            if (args[2] == undefined) {

                                msg.channel.send("Please, specify the modder ID");

                            } else {

                                try {
                                    let modderID = parseInt(args[2]);

                                    if (isNaN(modderID)) {
                                        msg.channel.send("That's not a valid modderID, it needs to be a number");
                                    }
                                    else {

                                        let searchedModder;

                                        for (let i = 0; i < modderList.length; i++) {
                                            if (modderList[i].modderID == modderID) {
                                                searchedModder = modderList[i];
                                                let _msg = ModderInfo(searchedModder);
                                                msg.channel.send(_msg);
                                                break;
                                            }
                                        }

                                        if (searchedModder === undefined) {
                                            msg.channel.send("No modder found with that ID");
                                        }




                                    }
                                } catch (error) {
                                    log.error(error);
                                }

                            }

                            break;

                        default:

                            let searchedModder;
                            let modderName = GetModderName(args, 1);

                            try {
                                for (let i = 0; i < modderList.length; i++) {
                                    for (let j = 0; j < modderList[i].names.length; j++) {

                                        if (modderName === modderList[i].names[j].toLowerCase()) {

                                            searchedModder = modderList[i];
                                            let _msg = ModderInfo(searchedModder);

                                            msg.channel.send(_msg);
                                            break;
                                        }

                                    }
                                }


                                if (searchedModder == undefined) {
                                    msg.channel.send("No modder found with that name");
                                }

                            } catch (error) {
                                log.error(error);
                            }
                            break;
                    }
                    break;


                case "compare":
                    switch (args[1]) {
                        case "modder":
                        case "modders":

                            if (args[2] == undefined) {
                                msg.channel.send("You need to specify two modders");
                                break;
                            }

                            if (args[3] == undefined) {
                                msg.channel.send("What am I supposed to compare this modder with? >:(");
                                break;
                            }



                            let firstModder = SearchForModder(args[2]);

                            if (firstModder == null) {
                                msg.channel.send("First modder not found");
                                break;
                            }

                            let secondModder = SearchForModder(GetModderName(args, 3));

                            if (secondModder == null) {
                                msg.channel.send("Second modder not found");
                                break;
                            }

                            let _msg = "";

                            if (firstModder.uniqueDownloads > secondModder.uniqueDownloads) {
                                _msg = ModderInfo(firstModder);
                                _msg = _msg.concat(ModderInfo(secondModder));
                                _msg = _msg.concat(ModderCompareInfo(firstModder, secondModder));
                            }
                            else {
                                _msg = ModderInfo(secondModder);
                                _msg = _msg.concat(ModderInfo(firstModder));
                                _msg = _msg.concat(ModderCompareInfo(secondModder, firstModder));
                            }


                            msg.channel.send(_msg);
                            break;

                        case "mod":
                        case "mods":

                            if (args[2] == undefined) {
                                msg.channel.send("You need to specify two mod IDs");
                                break;
                            }

                            if (args[3] == undefined) {
                                msg.channel.send("What am I supposed to compare this mod with? >:(");
                                break;
                            }

                            let firstMod = SearchForMod(args[2]);
                            console.log(firstMod);

                            if (firstMod == null) {
                                msg.channel.send("First mod not found");
                                break;
                            }

                            let secondMod = SearchForMod(args[3]);
                            console.log(secondMod);

                            if (secondMod == null) {
                                msg.channel.send("Second mod not found");
                                break;
                            }

                            let _modmsg = "";



                            if (firstMod.uniqueDownloads > secondMod.uniqueDownloads) {
                                _modmsg = ModInfo(firstMod);
                                _modmsg = _modmsg.concat(ModInfo(secondMod));
                                _modmsg = _modmsg.concat(ModCompareInfo(firstMod, secondMod));
                            }
                            else {
                                _modmsg = ModInfo(secondMod);
                                _modmsg = _modmsg.concat(ModInfo(firstMod));
                                _modmsg = _modmsg.concat(ModCompareInfo(secondMod, firstMod));
                            }


                            msg.channel.send(_modmsg);
                            break;

                        default:
                            msg.channel.send("Specify if you're comparing mods or modders. To compare modder modderName1 modderName2 or compare mod modID1 modID2");
                            break;
                    }
                    break;
                case "ranking":

                    switch (args[1]) {

                        case "modder":
                        case "modders":

                            if (args[2] == undefined) {
                                msg.channel.send("Specify a position on the ranking");
                                break;
                            }

                            let position = parseInt(args[2]);
                            if (isNaN(position)) {
                                msg.channel.send("The position should be a number, dipshit");
                                break;
                            }

                            if (position > modderList.length) {
                                msg.channel.send("There are not that many modders");
                                break;
                            }

                            let modmessage = ModderInfo(modderList[position - 1]);

                            msg.channel.send(modmessage);


                            break;

                        case "mod":
                        case "mods":
                            if (args[2] == undefined) {
                                msg.channel.send("Specify a position on the ranking");
                                break;
                            }

                            let _position = parseInt(args[2]);
                            if (isNaN(_position)) {
                                msg.channel.send("The position should be a number, dipshit");
                                break;
                            }

                            if (_position > gameValuesList.length) {
                                msg.channel.send("There are not that many mods");
                                break;
                            }

                            let modsmessage = ModInfo(gameValuesList[_position - 1]);

                            msg.channel.send(modsmessage);
                            break;


                        default:
                            msg.channel.send("Specify ranking mod or ranking modder");
                            break;


                    }
                    break;

                case "latest":
                    if (args[1] == undefined) {
                        msg.channel.send("Specify a modder");
                        break;
                    }

                    let _modderName_ = "";
                    _modderName_ = GetModderName(args, 1);

                    let modderLatest = SearchForModder(_modderName_);

                    if (modderLatest == null) {
                        msg.channel.send("Modder not found");
                        break;
                    }

                    let latestMod = GetLatestModFromModder(modderLatest);

                    if (latestMod == null) {
                        msg.channel.send("No mods found on this modder... wtf?");
                    }
                    else {
                        msg.channel.send(ModInfo(latestMod));
                    }

                    break;


                case "first":
                    if (args[1] == undefined) {
                        msg.channel.send("Specify a modder");
                        break;
                    }

                    let modderName = GetModderName(args, 1);

                    let modderFirst = SearchForModder(modderName);

                    if (modderFirst == null) {
                        msg.channel.send("Modder not found");
                        break;
                    }

                    let firstMod = GetFirstModFromModder(modderFirst);

                    if (firstMod == null) {
                        msg.channel.send("No mods found on this modder... wtf?");
                    }
                    else {
                        msg.channel.send(ModInfo(firstMod));
                    }

                    break;

                case "best":
                    if (args[1] == undefined) {
                        msg.channel.send("Specify a modder");
                        break;
                    }

                    let _modderName = GetModderName(args, 1);

                    let modderBest = SearchForModder(_modderName);

                    if (modderBest == null) {
                        msg.channel.send("Modder not found");
                        break;
                    }


                    let bestMod = GetBestModFromModder(modderBest);

                    if (bestMod == null) {
                        msg.channel.send("No mods found on this modder... wtf?");
                    }
                    else {
                        msg.channel.send(ModInfo(bestMod));
                    }
                    break;

                case "bscore":
                    let bmessage = "";

                    msg.channel.send("---MODDER RANKING---");
                    for (let i = 0; i < 3; i++) {


                        let _msg = ModderInfo(bScoreList[i]);
                        bmessage = bmessage.concat(_msg);
                    }

                    msg.channel.send(bmessage);
                    bmessage = "";

                    for (let i = 3; i < 6; i++) {

                        let _msg = ModderInfo(bScoreList[i]);
                        bmessage = bmessage.concat(_msg);
                    }

                    msg.channel.send(bmessage);
                    bmessage = "";

                    for (let i = 6; i < 9; i++) {

                        let _msg = ModderInfo(bScoreList[i]);
                        bmessage = bmessage.concat(_msg);
                    }

                    msg.channel.send(bmessage);

                    bmessage = "";

                    for (let i = 9; i < 10; i++) {

                        let _msg = ModderInfo(bScoreList[i]);
                        bmessage = bmessage.concat(_msg);
                    }

                    msg.channel.send(bmessage);
                    break;

                default:
                    if (args[0] == "") {
                        msg.channel.send(`NexSpy version ${version}. Coded by ebediam, with some adjustments by Zephlyn.`);
                    }
                    break;
                }

        }
    }







});



bot.login(token);



