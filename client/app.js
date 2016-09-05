import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_EMAIL'
});



Meteor.subscribe('messages');
Meteor.subscribe('votes');
Meteor.subscribe('channels', Meteor.userId());
Meteor.subscribe('posts', Meteor.userId());
Meteor.subscribe('follows', Meteor.userId());
Meteor.subscribe('allUsernames');
Meteor.subscribe('facebookusers');

Posts.allow({
    insert: function(userId, doc) {
        return (userId && doc.user === userId);
    }
});


Follows.allow({
    insert: function(userId, doc) {
        return (userId && doc.user === userId);
    }
});

Posts.before.insert(function(userId, doc) {
    doc.timestamp = Date.now();
});

Posts.after.insert(function(userId, doc) {
    //Router.go('/arenas/' + userId + '/' + channel);
});

Channels.after.insert(function(userId, doc) {
    var channel = doc.subject;
    var username = usernameFromId(doc.u1);
    Router.go('/arenas/' + username + '/' + channel);
});

// Votes.after.insert(function (obj,lastinsert) {
//   var result = Template.message.__helpers.get('getvotes').call(this,lastinsert.message, lastinsert.type)
// });


//helpers

Template.registerHelper("usernameFromId", function(userId) {


    var user = Meteor.users.findOne({ _id: userId });
    if (typeof user === "undefined") {
        return "Anonymous";
    }

    return user.username;
});

Template.registerHelper('equals', function(a, b) {
    return a === b;
});

Template.registerHelper("timestampToTime", function(timestamp) {
    var date = new Date(timestamp);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    return hours + ':' + minutes.substr(minutes.length - 2) + ':' + seconds.substr(seconds.length - 2);
});


Template.channels.helpers({
    channels: function() {

        return Channels.find({ $or: [{ 'u1': Meteor.userId() }, { 'u2': Meteor.userId() }] });
    }
});
Template.channel.helpers({
    active: function() {
        if (Session.get('channel') === this.name) {
            return "active";
        } else {
            return "";
        }
    }
});

Template.posts.helpers({
    posts: function() {

        return Posts.find({ u: Meteor.userId() });
    }
});

Template.messages.helpers({
    messages: Messages.find({}),
    channel: function() {
        var channel = Channels.findOne({ subject: Session.get('channel') });
        channel.obju1 = getUserObj(channel.u1);
        channel.obju1.score = getChannelScore(channel._id, channel.u1);
        channel.obju2 = getUserObj(channel.u2);
        channel.obju2.score = getChannelScore(channel._id, channel.u2);
        return channel;
    }
});
Template.messages.onCreated(function() {
    var self = this;
    self.autorun(function() {
        self.subscribe('messages', Session.get('channel'));
    });
});


Template.message.helpers({
    getvotes: function(message, type) {
        return getMessageScore(message, type);
    },
    hasvoted: function(message) {
        return hasVoted(message);
    },
    doEmojie: function(text) {
        return doEmojie(Template.message, text);
    }
});

Template.createchannel.helpers({
    subject: function(message, type) {
        return Session.get('subject');
    }
});


Template.users.helpers({
    results: function() {
        var query = Session.get("user-search-query"),
            results;
        if (query) {
            query = new RegExp(query, 'i');
            results = Meteor.users.find({ $or: [{ 'username': query }] });
        }
        return results;
    }
});

Template.user2.helpers({
    results: function() {
        var u2 = Session.get("u2"),
            results;
        var u3 = Session.get("u3"),
            results;
        if (u2) {
            u2 = new RegExp(u2, 'i');
            results = Meteor.users.find({ $or: [{ 'username': u2 }] });
        }
        return results;
    }
});

Template.user3.helpers({
    results: function() {
        var u2 = Session.get("u2"),
            results;
        var u3 = Session.get("u3"),
            results;
        if (u3) {
            u3 = new RegExp(u3, 'i');
            results = Meteor.users.find({ $or: [{ 'username': u3 }] });
        }
        return results;
    }
});


//functions
isChannelPrivate = function(subject) {

    var channel = Channels.find({ subject: subject });
    return channel.p;

};

whosTurnNext = function(subject, userId) {

    var channel = Channels.find({ subject: subject });
    if (channel.u1 == userId) {
        return channel.u2;
    } else if (channel.u2 == userId) {
        return channel.u1;
    }
};

whosTurnNow = function(subject) {

    var channel = Channels.findOne({ subject: subject });
    return channel.turn;

};

idFromSubject = function(subject) {
    var channel = Channels.findOne({ subject: subject });
    return channel._id;
};

idFromUsername = function(username) {

    var user = Meteor.users.findOne({ username: username });
    if (typeof user === "undefined") {
        return "Anonymous";
    }
    if (typeof user.services.github !== "undefined") {
        return user.services.github.username;
    }

    return user._id;
};

usernameFromId = function(userid) {

    var user = Meteor.users.findOne({ _id: userid });
    if (typeof user === "undefined") {
        return "Anonymous";
    }
    if (typeof user.services.github !== "undefined") {
        return user.services.github.username;
    }

    return user.username;
};

getUserObj = function(userid) {
    var user = Meteor.users.findOne({ _id: userid });
    return user;
};

idFollowFromName = function(follow) {

    var result

    switch (follow.type) {
        case 'u':
            result = Meteor.users.findOne({ username: follow.name });
            break;
        case 'c':
            result = Channels.findOne({ subject: follow.name });
            break;
        case 'p':
            result = Posts.findOne({ name: follow.name });
            break;
    }
    return result._id;
};
hasVoted = function(message) {
    var result = Votes.find({ 'message': message, 'u': Meteor.userId() });
    if (result.count()) {
        return true;
    } else {
        return false;
    }

}

getChannelScore = function(channel, userid) {

    processed_data = [];
    var result = 0;
    Deps.autorun(function(c) {

        var cursor = Votes.find({ 'channel': channel });
        if (!cursor.count()) return;

        cursor.forEach(function(row) {
            result += parseInt(row.value);
            processed_data.push(row.value);
        });

        c.stop();
    });
    return result;

}
getMessageScore = function(message, type) {

    processed_data = [];
    var result = 0;
    Deps.autorun(function(c) {
        console.log(message);
        console.log(type)
        var cursor = Votes.find({ 'message': message, 'type': type });
        if (!cursor.count()) return;

        cursor.forEach(function(row) {
            console.log(row.value);
            result += parseInt(row.value);
            processed_data.push(row.value);
        });

        c.stop();
    });


    return result;

}

userFromMessage = function(message) {
    var result = Messages.find({ '_id': message });
    return result.user;
}

doEmojie = function(tmpl, data) {
    data = data.replace(/(^|\W)(#[a-z\d][\w-]*)/ig, '<img class="emojie" src="/images/$2.jpg"/>');
    data = replaceAll(data, '#', '');
    return data;
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}


getFacebookFriendsCollection = function(facebookid, access_token) {

    var retries = 0;
    var count = 0;
    var self = this;
    response = {
        "data": [{
            "id": "AaI6W6uKIzzn2hCozxnTQizsgZq5vkqrPgdyNMuOLhgdY-rTdwUpboYH5HWDJj8Jh0mXdr7rh0O0w0-nM_EMmSMFeAf5Bg_7RoYiMPDQCD60_g",
            "name": "Danny Gallagher",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13912337_1402884216394529_8316027597837692498_n.jpg?oh=2cd391a80df4be4694dd2b2bf2fa01aa&oe=58380A93"
                }
            }
        }, {
            "id": "AaI8G0B0L19hVjr97y8Dm7WoIJfeoU7UsFf3zJhs24R_Z4HljAX7p9iwPZx3E0keBfIKrxw7N9fdkQ2EOD9VCrXYCi2RYq2Hdj7Rj6T8DqZumQ",
            "name": "Menna O'Neill",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/10426128_10153081121208809_2534188140066622807_n.jpg?oh=b4136221444e7df9e37f4233723a2796&oe=5845DD60"
                }
            }
        }, {
            "id": "AaLqRHfLHTojF9PXOPNoHwK09so-8dwfr4BIXo2C8GSKzLoTB5oJIQHMULGYpxDTSREwfYcjNaTPphb1ufTtKODrEydxk3Na5AQm0irvfQbBxQ",
            "name": "Daniel Wyatt",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/11781752_10155831179095104_3954621275025200070_n.jpg?oh=ab69a4878f71518e840d6644f86224cc&oe=58560277"
                }
            }
        }, {
            "id": "AaL7oz_f0C-BhCSlIO0F6JJJxdxMqq8nNaPvL1NRdWrXlaRpGHnkTDKx2us5qqkY_Sm-3CShnLutvTTEUf9xPcDYeuHoscVzpXNNc13yOHZwDw",
            "name": "Jane Forster",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c33.33.413.413/s50x50/205489_10150163560928711_6559954_n.jpg?oh=d611b5f9e989ad032848289a051dab94&oe=583B1453"
                }
            }
        }, {
            "id": "AaKsn8OCDAM4iI8Z7gtq0g3luoUX3TXUct1tXO19-LX9SCtQ4jvca0s3Dr3bhemc_AoitbOmjbHNCvXp1SarBNRZImU90bLlq1MhirmUtQnkvw",
            "name": "Steve Kennard",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13769417_939709629472133_5178254364337918206_n.jpg?oh=00845c948ca1b10f26c94faa0d9e391e&oe=5882A137"
                }
            }
        }, {
            "id": "AaKPM7azoZkrbsnis0TIUoTJgq5rReN7GKF4MOYpXQHf3NCkyvdj08poYv1aGG9Y5JSUTZCYp7hY1VSeXUduiNSCW1J9DhyMs7fq1H0BCjwBHg",
            "name": "Jade Amy Mendis",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13413783_10154065536800250_6332233563611589727_n.jpg?oh=87d476c44ec7de479d54ad7da0a736d4&oe=588019C5"
                }
            }
        }, {
            "id": "AaIcuoqojmHiFWsi9AqgPYNx3E5WyWreV2uvtXj8BKlp6WQ8Es4-_9V0D4yYz0k0EUVKmFQvIIwssfw8PAjTd0Qb0yeAAVsPxHxL3rZsAVKxAA",
            "name": "Robert Hanson",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13654199_268869776837902_206807433886821405_n.jpg?oh=47a3d9a279f5f3afbb4ca6541f96d9fe&oe=58565F41"
                }
            }
        }, {
            "id": "AaK1Yz8kVTh_F_IaTCJmAywsF-C8UWYOysqQHZeQZRNLOLQ8MRk3-UzmTixYHobpPF9F8FNPuZdQ5ucv7_RdMqu8RQCyXMEOFJ6jwX5wslEmYg",
            "name": "Tatiana Cutts",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13220829_10101540313571419_8083077085589067283_n.jpg?oh=104b11161da564cd2157fd92a35e6640&oe=58441ADA"
                }
            }
        }, {
            "id": "AaK8LRnt_pHcSRonx4HODUOcPmeFGKvu9eF2RNxXnYCL43VuyIRpUCiFOFe0WqqqcjNfG2PLpyU2UkQoso3-uGpVuxFaPwRRpGmLd74S0hw2MQ",
            "name": "Natasha Morrow",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/10429239_10100554544547110_5792995860646449109_n.jpg?oh=ae337123ef715081d52304ac1d183111&oe=5849BD9D"
                }
            }
        }, {
            "id": "AaIIrD-FgzHqhL2NosnFnv4B0FgOyU2a5OPQZHdvjXX3PQ2rYgWZnBSRCHAl-pMGOy0yKL76SAgwTkSKB148QCks7SoSSjrCLOdT-bBpUPvHWw",
            "name": "Jamie O'Neill",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13438976_10157085137495057_5791197936519691282_n.jpg?oh=34071748c342db33f59585ff41a19580&oe=583CFDC6"
                }
            }
        }, {
            "id": "AaKgh-CDVLx018x2f8kNoUq6QX5X6R0uwmiIjYWK75WO_2-OuWyjD9i5SOrFhaiL7qkvgrC_e0MDOKvNFTHYVCx_u0Q2YddUhnOIvPQUpGq6lw",
            "name": "Matthew Colman",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/12075061_832526480951_6943893048731380563_n.jpg?oh=7f4ae40e8e76aad9ee8684c2e44d579a&oe=587F8407"
                }
            }
        }, {
            "id": "AaKydj4JVwAun1kQ9bVyyPVnrX4LwSx5-YeKpPlqSJKKb05gpXX_h-thTtr63g5jdoTtsEznQL6e1EJakbBK_Af37oV72WRawDYwEoNy51MZJA",
            "name": "Jodie Richards",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/12924353_125134634552981_4993451745043989621_n.jpg?oh=ca498cea61c40cae07cec425333650ed&oe=58425124"
                }
            }
        }, {
            "id": "AaJWmyFDGyRxOxv73cQDGNwk1-Bwt_oX05ppwzySno5bYgkf_t9Jy7CJ-Lc0R9erjM69N0hBTf5ib1hwphMuFZHr1rF_7Vl-rvRZt3uf4vnZqg",
            "name": "Mike Burt",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c13.0.50.50/p50x50/12118611_124491101240824_8605061260171313925_n.jpg?oh=baa1d8f171a09ad074af2acf09e9312b&oe=5842674B"
                }
            }
        }, {
            "id": "AaIWo6MfcYJ866apYner2SBAlqzqrmuaPpl2YcPKEKS6JxQOq5Ge5fpJ7MtGrWjbTfSH7Fi0CXAQbgr_97Pq1TaUAhv-dDcEPICXkW8uLkV8Tw",
            "name": "Glenn Ward",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/12832479_105277186534259_2329403592726894102_n.jpg?oh=1fdb4ad5e7703e536577ef8eb221e439&oe=585110FA"
                }
            }
        }, {
            "id": "AaJLqSc1IyMzd9o55pXMYhZug38B01cyMyalApdC0MF7y3cBrhi6oxdNaOQpZfx_GBl3yDiff5B6VJciuN3W49EzgJnG94zMV--SBgDMUm5Ylg",
            "name": "Jamie Connelly",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c8.0.50.50/p50x50/13051634_10154157836843637_4697543272773999105_n.jpg?oh=08de5d99d4964d58c591f38313a0c3ed&oe=583B6B05"
                }
            }
        }, {
            "id": "AaKKyE43dPLSH4fx6Ko91NO5svI3Od5wYJ9kFqRTeM5VhTFX2rJPK0PwXYYDSE5IyaBdaIhOj5q22mLtso7T-4nuDNFy1OsOJdNuuBHhIveLbg",
            "name": "Carla Louise",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13240699_10153792445309285_4454321082185214572_n.jpg?oh=c49201747e934d9d31a88135cc504a5f&oe=584C05F9"
                }
            }
        }, {
            "id": "AaJZek3zE2MEQatQEZWZ7rTOCYauDAHm7CdO83SND2LpzC8T5LxfjyHzLTVFb7cMUm4rC88JhffgNH8ehv5_WFFGAbAXp5DekKrU1GBBl5rnXQ",
            "name": "Simon Ashbery",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13775809_10154400832799628_1501713102565760664_n.jpg?oh=15a14af2bff414068ee4c1390c1a7333&oe=583C675B"
                }
            }
        }, {
            "id": "AaJ4A3YvCQDmu8D8awbDPelv9zzTEuFuTR8-Y0cUsN6DMQWtnKBq7aE17WijbXEwpJyfq52RRnUKtclgvcCpmv4TeQxqB9GoNeYytdFxiwtBxQ",
            "name": "Malcolm ONeill",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c12.0.50.50/p50x50/10592684_444767535733948_8016060023065653408_n.jpg?oh=c0552165eb5584631f4cb8fb6858c63e&oe=5884ED16"
                }
            }
        }, {
            "id": "AaIifH-yVdZhJKUNI5wVvLQLJG9ck-uhkwt6BunV7zGLK1-9erHFXimruDGBg0dlZVULuzWdJjbHB9zGc0CgtLsjI3foyKmh-A5iHSeqzjJe9A",
            "name": "Mike Lewis",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/12043226_10154272010530476_2844695150013874636_n.jpg?oh=3ddb1a76d3ae4f28c27917ab3d65b9b6&oe=583E990F"
                }
            }
        }, {
            "id": "AaIC4gxpBEmV8fzOgNzlUdFzypWn9oiLzFAf7IwfwNU9hpOCa50VKzHoylPHY2m-RyUCW4cjWBRkXkyUUqUSoHFYDSMRt6zQvPhbIuzGHZepuQ",
            "name": "Stephanie Miksch",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13344808_10153625451681444_6267633779549881478_n.jpg?oh=2e5e3e63d543ca391996bc450f2e1847&oe=588613DC"
                }
            }
        }, {
            "id": "AaK9Egcc9wyLBJ7pAWirnv5uO8WTowD-PFLPqDev4fQ64AJCf3bJi2W-y7LMazPgNS6eS-sgbhdae1ZV8qqXzL211lI3IJKPNRy5eoUgwNjkQw",
            "name": "Alan Mason",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/12540573_10207374599956880_6392027759341986255_n.jpg?oh=94f739364ebf37d4dd0972c53d467b5c&oe=583B1E4A"
                }
            }
        }, {
            "id": "AaKNNCl14L7fWXBd9XF5gjRuEuJ776IYeGmp_U2U7sC4-J8Ga08dPrgAQSTM1AMLKIuZOK9y94G7WXjaHVDFR-CJoEAX2k4rEPOMw1Aa-di7QQ",
            "name": "Carsten Müller",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c0.9.50.50/p50x50/309819_10150315359357719_1036946181_n.jpg?oh=9b9f19fa9d23aec8460ef7ba791825c4&oe=584EEFE1"
                }
            }
        }, {
            "id": "AaIYaMbNPJ3AGhmka7rulz2kokYLI_PZbww0n3b00bQwk274mXc_sb-39DOTZiDZa1mgrJ3HAMihpVmul4iRqZ4J3i7KJ88C3pOoECO_2gPHvg",
            "name": "Michael Skwarek",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/c170.50.621.621/s50x50/1004832_10100584788162241_1123478735_n.jpg?oh=7b58b39d65669e51088ba4a6dac5cb92&oe=5885EA30"
                }
            }
        }, {
            "id": "AaK4NXv6Bz3KmmYcdBAyTMTOanVptuNFpgiYWXbxq-fqZ2PMX8jEXkEtJzYPRFH7e3e84W8ED7tDHvZw4EtMoKvpZfHZzjzgJitD7yEnGUq7dw",
            "name": "Geoff Beadle",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/11160578_10153847135088345_4618983123765937391_n.jpg?oh=e9270db20751511da9779751b75211bd&oe=58479E9A"
                }
            }
        }, {
            "id": "AaLGbCkc5LsNHjVaFOQdkbtZPzVKU6K2sdOedSmGwVCRG2fRqeRgRVmKc4pGCznypiOVGdRsuuATuWBaOObljFYizEo9dMolCNznI1lvuOsMYQ",
            "name": "Ria Langford",
            "picture": {
                "data": {
                    "is_silhouette": false,
                    "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/13631528_10208643316454205_4660937755212460930_n.jpg?oh=2c2be9c5e765a9472d68c7de1ad86bc8&oe=58405927"
                }
            }
        }],
        "paging": {
            "cursors": {
                "before": "QWFMbEE0eGE2UHh5MFgxdno3R0lJN0trc3p2eWRhcVdWcEF2S2RWVkFUVk1BMXVSZAF9VaGdPYmdQdlpYOHg0T3AzdGV4VUlJQkVkcnVWTFZA0VW5oU1J3QnJHY1J1QnRBYVpHU1RGY3lCZA0F0NVEZD",
                "after": "QWFMc3ZAvYVE0aDRjS09FU3JWaGRJTzBJbHFhVm80eXVZARUZAaNXp4MVo2b2dhblE1WFNfNU1SZAXRJeUh0U1hvRXd5U1hWMC1DT05RVmNtTmNkbkJKNzE4alNBWWhpNmRKbHpGOENyenpsd0phOUEZD"
            },
            "next": "https://graph.facebook.com/v2.7/10157476046310495/taggable_friends?access_token=<access token sanitized>&pretty=0&limit=25&after=QWFMc3ZAvYVE0aDRjS09FU3JWaGRJTzBJbHFhVm80eXVZARUZAaNXp4MVo2b2dhblE1WFNfNU1SZAXRJeUh0U1hvRXd5U1hWMC1DT05RVmNtTmNkbkJKNzE4alNBWWhpNmRKbHpGOENyenpsd0phOUEZD"
        }
    };
    if (response && !response.error) {
        var items = response.data;
        var paging = response.paging;
        if (items.length > 0) {
            items.map(function(item) {
                FacebookFriends.insert(item);
            });
        }
    } else if (retries < 3) {
        retries += 1;
        console.log("FB: ", response.error);
    } else {
        console.log("Exceeded");
    }

    // var user = Meteor.user();
    // if(user != undefined)
    // {
    //     var services = user.services;
    //     if(services != undefined){
    //         var facebook = user.services.facebook;
    //         if(facebook != undefined){
    //         var facebookid = facebook.id;
    //         var access_token = facebook.accessToken;

    //         FB.api('me/friends?access_token='+ access_token, function(response) {

    //         });
    //       }
    //     }

    // }


}
