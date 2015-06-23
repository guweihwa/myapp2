var proxyquire, httpsStub, appStub, mongooseStub, server,
    www = function() {
        proxyquire('../../bin/www', {
            '../app': appStub,
            'https': httpsStub,
            'mongoose': mongooseStub
        });
    };

describe('WWW', function() {
    beforeEach(function(){
        proxyquire = require('proxyquire'),
        server = {       
            listen: sinon.spy(),
            on: sinon.spy()
        },
        httpsStub = {
            createServer: sinon.stub().returns(server)
        },
        appStub = {
            set: sinon.spy(),
            get: sinon.stub().returns(3000)
        },       
        mongooseStub = {
            connect: sinon.spy(),
            connection: {
                on: sinon.spy()
            }
        };

        delete process.env.PORT;
    });

    describe('Bootstrapping', function(){
        it('should create the https', function(){
            www();
            expect(httpsStub.createServer).to.be.called;
        });
        it('should set the x-powered-by', function(){
            www();
            expect(appStub.set.secondCall.args[0]).to.equal('x-powered-by');
            expect(appStub.set.secondCall.args[1]).to.equal(false);
        });
        it('should connect with mongoose', function(){
            www();
            expect(mongooseStub.connect).to.be.calledWith(sinon.match.string);
        });
        it('should launch the app', function(){
            www();
            expect(server.listen).to.be.calledWith(3000, sinon.match.func);
        });
    });

    describe('Port', function(){
        it('should be set', function() {
            www();
            expect(appStub.set.firstCall.args[0]).to.equal('port');
        });
        it('should default to 3000', function() {
            www();
            expect(appStub.set.firstCall.args[1]).to.equal(3000);
        });
        it('should be configurable', function() {
            process.env.PORT = '5500';
            www();
            expect(appStub.set.firstCall.args[1]).to.equal(5500);
        });
    });
});