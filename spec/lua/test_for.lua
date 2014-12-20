
local arr = {1,2,3}
for i=1, #arr do
	print(arr[i])
end

local ray = {name="ray", handsome=true}
local k = 'age'
ray[k] = 40
print(ray['name'], ray.age, ray.handsome)

local keys = redis.call('keys','hash_key*')
local data = {}
for i=1, #keys do
	local k = keys[i]
	data[i] = {k, redis.call('hgetall', k)}
end
print(data)

